import { execSync } from "child_process";
import OpenAI from "openai";

function sh(cmd) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
}

function shInherit(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function run() {
  try {
    // 0) safety check
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      console.error("❌ OPENAI_API_KEY is missing. Set it in .env.local or OS env.");
      process.exit(1);
    }

    // 1) Stage
    console.log("🔍 Staging changes...");
    shInherit("git add -A");

    const diffStat = sh("git diff --cached --stat");
    if (!diffStat) {
      console.log("✅ No staged changes. Nothing to commit.");
      return;
    }

    // 2) Also capture branch (helps message)
    const branch = sh("git rev-parse --abbrev-ref HEAD");

    // 3) Generate commit message
    console.log("🤖 Generating commit message with AI...");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You generate concise git commit messages. Use imperative mood. No quotes. Max 72 chars. English is fine.",
        },
        {
          role: "user",
          content: `Branch: ${branch}\n\nGenerate a clear git commit message for these staged changes:\n\n${diffStat}`,
        },
      ],
      max_tokens: 60,
    });

    let message = (completion.choices?.[0]?.message?.content || "").trim();
    if (!message) message = "Update changes";

    // sanitize (avoid breaking shell)
    message = message.replace(/[\r\n]+/g, " ").replace(/"/g, '\\"');

    console.log(`📝 Commit message:\n${message}\n`);

    // 4) Commit
    shInherit(`git commit -m "${message}"`);

    // 5) Push
    console.log("🚀 Pushing...");
    shInherit("git push");

    console.log("✅ Done.");
  } catch (err) {
    console.error("❌ Error:", err?.message || err);
    // show git hints if useful
    try {
      console.log("\n--- git status ---");
      shInherit("git status");
    } catch {}
    process.exit(1);
  }
}

run();