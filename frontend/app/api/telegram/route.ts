import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { telegramClient } from "@/lib/telegram/client";
import { parseSplits, ImageNotSupportedError } from "@/lib/llm";
import { validateSplits, matchPerson } from "@/lib/splits/validation";
import { PersonContext } from "@/lib/llm/types";

export const dynamic = "force-dynamic";

function formatPaiseToInr(paise: number): string {
  const inr = Math.abs(paise) / 100;
  return `₹${inr % 1 === 0 ? inr.toFixed(0) : inr.toFixed(2)}`;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Security: Verify secret token header if configured
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (expectedSecret) {
      const headerSecret = req.headers.get("x-telegram-bot-api-secret-token");
      if (headerSecret !== expectedSecret) {
        console.warn("[Telegram Webhook] Invalid secret token received");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const payload = await req.json();
    const updateId = payload.update_id;
    const message = payload.message;

    if (!updateId || !message) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat?.id?.toString();
    const messageId = message.message_id;
    const text: string = (message.text || message.caption || "").trim();

    // 2. Security: Verify allowed chat ID
    const allowedChatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
    if (allowedChatId && chatId !== allowedChatId) {
      // Silently ignore unauthorized chat IDs
      return NextResponse.json({ ok: true });
    }

    const supabase = getSupabaseServerClient();

    // 3. Webhook Idempotency: Deduplicate on update_id
    const { error: dedupeErr } = await supabase.from("telegram_updates").insert({
      update_id: updateId,
      chat_id: chatId,
      message_id: messageId,
    });

    if (dedupeErr) {
      // update_id already processed or duplicate delivery
      console.info(`[Telegram Webhook] Skipping already processed update_id=${updateId}`);
      return NextResponse.json({ ok: true });
    }

    // 4. Handle Bot Commands
    if (text.startsWith("/")) {
      const parts = text.split(/\s+/);
      const command = parts[0].toLowerCase();

      // Command: /balance
      if (command === "/balance") {
        const { data: balances, error: balErr } = await supabase
          .from("v_person_balances")
          .select("*");

        if (balErr || !balances || balances.length === 0) {
          await telegramClient.sendMessage(chatId, "📊 Balances:\nAll settled up! No outstanding balances.");
          return NextResponse.json({ ok: true });
        }

        const lines = balances.map((b) => {
          const net = b.net_balance_paise;
          if (net > 0) {
            return `• ${b.name} owes you ${formatPaiseToInr(net)}`;
          } else if (net < 0) {
            return `• You owe ${b.name} ${formatPaiseToInr(Math.abs(net))}`;
          } else {
            return `• ${b.name}: settled up`;
          }
        });

        await telegramClient.sendMessage(chatId, `📊 Current Balances:\n${lines.join("\n")}`);
        return NextResponse.json({ ok: true });
      }

      // Command: /undo
      if (command === "/undo") {
        // Find most recently approved transaction with splits
        const { data: lastTxns } = await supabase
          .from("transactions")
          .select("id, amount_cents, description, account_id, type")
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(1);

        if (!lastTxns || lastTxns.length === 0) {
          await telegramClient.sendMessage(chatId, "No recently approved transaction found to undo.");
          return NextResponse.json({ ok: true });
        }

        const txnToUndo = lastTxns[0];

        // Delete splits
        await supabase.from("transaction_splits").delete().eq("transaction_id", txnToUndo.id);

        // Revert status to staged/pending
        await supabase
          .from("transactions")
          .update({ status: "pending" })
          .eq("id", txnToUndo.id);

        // Reverse account balance
        const { data: accData } = await supabase
          .from("accounts")
          .select("type")
          .eq("id", txnToUndo.account_id)
          .single();

        if (accData) {
          const isCc = accData.type === "credit_card";
          const delta = isCc
            ? (txnToUndo.type === "expense" ? -txnToUndo.amount_cents : txnToUndo.amount_cents)
            : (txnToUndo.type === "income" ? -txnToUndo.amount_cents : txnToUndo.amount_cents);

          await supabase.rpc("increment_balance", {
            account_id: txnToUndo.account_id,
            delta,
          });
        }

        await telegramClient.sendMessage(
          chatId,
          `Undone ↩️ Reverted transaction of ${formatPaiseToInr(txnToUndo.amount_cents)} at ${txnToUndo.description || "Merchant"} and restored account balance.`
        );
        return NextResponse.json({ ok: true });
      }

      // Command: /settle <person> <amount>
      if (command === "/settle") {
        if (parts.length < 3) {
          await telegramClient.sendMessage(chatId, "Usage: /settle <person> <amount in ₹>\nExample: /settle Rohan 150");
          return NextResponse.json({ ok: true });
        }

        const personQuery = parts[1];
        const rawAmount = parseFloat(parts[2].replace(/[^\d.]/g, ""));

        if (isNaN(rawAmount) || rawAmount <= 0) {
          await telegramClient.sendMessage(chatId, "Please provide a valid positive amount. Example: /settle Rohan 150");
          return NextResponse.json({ ok: true });
        }

        const amountPaise = Math.round(rawAmount * 100);

        // Resolve people
        const { data: peopleData } = await supabase.from("people").select("*");
        const peopleList: PersonContext[] = (peopleData || []).map((p) => ({
          id: p.id,
          user_id: p.user_id,
          name: p.name,
          is_me: p.is_me,
          aliases: p.aliases || [],
        }));

        const mePerson = peopleList.find((p) => p.is_me);
        const targetPerson = matchPerson(personQuery, peopleList);

        if (!targetPerson || targetPerson.is_me) {
          await telegramClient.sendMessage(
            chatId,
            `Could not find a valid person matching '${personQuery}'. Known people: ${peopleList.filter((p) => !p.is_me).map((p) => p.name).join(", ")}`
          );
          return NextResponse.json({ ok: true });
        }

        if (!mePerson) {
          await telegramClient.sendMessage(chatId, "Error: Default 'Me' profile not found in database.");
          return NextResponse.json({ ok: true });
        }

        // Insert settlement: targetPerson paid mePerson
        const { error: setErr } = await supabase.from("settlements").insert({
          user_id: mePerson.user_id || targetPerson.user_id,
          from_person: targetPerson.id,
          to_person: mePerson.id,
          amount_paise: amountPaise,
          date: new Date().toISOString().split("T")[0],
          note: `Repayment via Telegram /settle`,
        });

        if (setErr) {
          console.error("Settlement insert error:", setErr);
          await telegramClient.sendMessage(chatId, `Failed to record settlement: ${setErr.message}`);
          return NextResponse.json({ ok: true });
        }

        await telegramClient.sendMessage(
          chatId,
          `Settled ✅ Recorded repayment of ${formatPaiseToInr(amountPaise)} from ${targetPerson.name}.`
        );
        return NextResponse.json({ ok: true });
      }
    }

    // 5. Match Reply to Transaction Notification
    let targetTransaction: any = null;
    let isFallbackToLatest = false;

    if (message.reply_to_message?.message_id) {
      const replyMsgId = message.reply_to_message.message_id;
      const { data: matched } = await supabase
        .from("transactions")
        .select("*")
        .eq("telegram_message_id", replyMsgId)
        .limit(1);

      if (matched && matched.length > 0) {
        targetTransaction = matched[0];
      }
    }

    // Fallback: match most recent pending/staged transaction
    if (!targetTransaction) {
      const { data: latestPending } = await supabase
        .from("transactions")
        .select("*")
        .in("status", ["pending", "staged", "awaiting_clarification"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (latestPending && latestPending.length > 0) {
        targetTransaction = latestPending[0];
        isFallbackToLatest = true;
      }
    }

    if (!targetTransaction) {
      await telegramClient.sendMessage(
        chatId,
        "No pending transaction found to split. You're all caught up! ✨",
        { replyToMessageId: messageId }
      );
      return NextResponse.json({ ok: true });
    }

    // 6. Handle Image (Order Screenshot) or Text
    let imagePayload: { base64: string; mimeType: string } | undefined;

    if (message.photo && Array.isArray(message.photo) && message.photo.length > 0) {
      const largestPhoto = message.photo[message.photo.length - 1];
      try {
        const fileInfo = await telegramClient.getFile(largestPhoto.file_id);
        imagePayload = await telegramClient.downloadFileAsBase64(fileInfo.file_path);
      } catch (err: any) {
        console.error("Failed to download image from Telegram:", err);
        await telegramClient.sendMessage(
          chatId,
          "Failed to download the screenshot from Telegram. Please try typing the split instead.",
          { replyToMessageId: messageId }
        );
        return NextResponse.json({ ok: true });
      }
    }

    // 7. Load Known People from Database
    const { data: peopleRows } = await supabase
      .from("people")
      .select("*")
      .eq("user_id", targetTransaction.user_id);

    const people: PersonContext[] = (peopleRows || []).map((p) => ({
      id: p.id,
      user_id: p.user_id,
      name: p.name,
      is_me: p.is_me,
      aliases: p.aliases || [],
    }));

    // 8. Call LLM parseSplits
    let rawResult;
    try {
      rawResult = await parseSplits({
        text: text || undefined,
        image: imagePayload,
        context: {
          total_paise: targetTransaction.amount_cents,
          merchant: targetTransaction.description || "Unknown",
          people,
        },
      });
    } catch (err: any) {
      if (err instanceof ImageNotSupportedError) {
        await telegramClient.sendMessage(
          chatId,
          `The active AI model does not support image screenshots. Please type your split instructions as text instead.`,
          { replyToMessageId: messageId }
        );
        return NextResponse.json({ ok: true });
      }

      console.error("LLM parseSplits error:", err);
      await telegramClient.sendMessage(
        chatId,
        `Sorry, I encountered an error while calculating splits: ${err.message || "Unknown error"}. Please try again.`,
        { replyToMessageId: messageId }
      );
      return NextResponse.json({ ok: true });
    }

    // 9. Server-Side Validation
    const validation = validateSplits(
      rawResult.splits,
      targetTransaction.amount_cents,
      people
    );

    if (!validation.isValid) {
      // Mark status as awaiting_clarification and reply with specific question
      await supabase
        .from("transactions")
        .update({ status: "awaiting_clarification" })
        .eq("id", targetTransaction.id);

      const prefix = isFallbackToLatest
        ? `(Matching recent: ${formatPaiseToInr(targetTransaction.amount_cents)} at ${targetTransaction.description || "Merchant"})\n`
        : "";

      await telegramClient.sendMessage(
        chatId,
        `${prefix}${validation.clarificationPrompt}`,
        { replyToMessageId: messageId }
      );
      return NextResponse.json({ ok: true });
    }

    // 10. Validation Passed! Persist splits and approve transaction
    // Remove existing splits if any (e.g. re-split)
    await supabase
      .from("transaction_splits")
      .delete()
      .eq("transaction_id", targetTransaction.id);

    const splitRows = validation.splits.map((s) => ({
      transaction_id: targetTransaction.id,
      person_id: s.person_id,
      amount_paise: s.amount_paise,
      category: s.category || targetTransaction.category || "Miscellaneous",
      note: s.note,
      parsed_by: rawResult.parsed_by,
    }));

    const { error: splitInsertErr } = await supabase
      .from("transaction_splits")
      .insert(splitRows);

    if (splitInsertErr) {
      console.error("Error inserting transaction splits:", splitInsertErr);
      await telegramClient.sendMessage(
        chatId,
        `Database error saving splits: ${splitInsertErr.message}`,
        { replyToMessageId: messageId }
      );
      return NextResponse.json({ ok: true });
    }

    // Mark transaction approved
    await supabase
      .from("transactions")
      .update({ status: "approved" })
      .eq("id", targetTransaction.id);

    // Update account balance atomically via increment_balance
    const { data: acc } = await supabase
      .from("accounts")
      .select("type")
      .eq("id", targetTransaction.account_id)
      .single();

    if (acc) {
      const isCc = acc.type === "credit_card";
      const delta = isCc
        ? (targetTransaction.type === "expense" ? targetTransaction.amount_cents : -targetTransaction.amount_cents)
        : (targetTransaction.type === "income" ? targetTransaction.amount_cents : -targetTransaction.amount_cents);

      await supabase.rpc("increment_balance", {
        account_id: targetTransaction.account_id,
        delta,
      });
    }

    // Send confirmation message to Telegram
    const fallbackNotice = isFallbackToLatest
      ? `[Matched latest: ${targetTransaction.description || "Transaction"}]\n`
      : "";

    await telegramClient.sendMessage(
      chatId,
      `${fallbackNotice}${validation.summaryText}`,
      { replyToMessageId: messageId }
    );

    return NextResponse.json({ ok: true });
  } catch (globalErr: any) {
    console.error("[Telegram Webhook] Global error:", globalErr);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
