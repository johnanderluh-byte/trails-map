const key = process.env.GEMINI_API_KEY;
const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
const { models } = await res.json();
models?.filter(m => m.supportedGenerationMethods?.includes('generateContent'))
       .forEach(m => console.log(m.name));
