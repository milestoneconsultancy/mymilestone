const fs = require('fs');
const readline = require('readline');
const rl = readline.createInterface({
  input: fs.createReadStream('C:/Users/aghug/.gemini/antigravity/brain/0ca6c74d-ae23-43ad-ba40-0fe6fed1e7a6/.system_generated/logs/transcript_full.jsonl')
});
rl.on('line', (line) => {
  try {
    const data = JSON.parse(line);
    if (data.type === 'USER_INPUT' && data.content && data.content.includes('MASTER PROMPT')) {
      fs.writeFileSync('MASTER_PROMPT.md', data.content);
      console.log('Saved MASTER_PROMPT.md, length:', data.content.length);
      process.exit(0);
    }
  } catch(e) {}
});
