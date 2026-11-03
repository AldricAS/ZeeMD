import axios from 'axios';

// ================================
// Helper: strip HTML tags
// ================================
function stripHtml(html) {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, '')
		.replace(/<style[\s\S]*?<\/style>/gi, '')
		.replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&nbsp;/gi, ' ')
		.replace(/&amp;/gi, '&')
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>')
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/gi, "'")
		.replace(/\s{2,}/g, ' ')
		.trim();
}

// ================================
// Helper: extract links from HTML
// ================================
function extractLinks(html, baseUrl) {
	const links = [];
	const regex = /href=["']([^"'#]+)["']/gi;
	let match;
	while ((match = regex.exec(html)) !== null) {
		try {
			const abs = new URL(match[1], baseUrl).href;
			if (!links.includes(abs)) links.push(abs);
		} catch {}
	}
	return links.slice(0, 20);
}

// ================================
// Helper: extract meta tags
// ================================
function extractMeta(html) {
	const meta = {};

	const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
	if (title) meta.title = stripHtml(title[1]).slice(0, 200);

	const desc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
		|| html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
	if (desc) meta.description = desc[1].slice(0, 300);

	const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
	if (ogTitle) meta.ogTitle = ogTitle[1].slice(0, 200);

	const ogDesc = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
	if (ogDesc) meta.ogDesc = ogDesc[1].slice(0, 300);

	const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
	if (ogImage) meta.ogImage = ogImage[1];

	return meta;
}

// ================================
// Helper: extract forms
// ================================
function extractForms(html) {
	const forms = [];
	const formRegex = /<form[\s\S]*?<\/form>/gi;
	let match;
	while ((match = formRegex.exec(html)) !== null) {
		const action = (match[0].match(/action=["']([^"']+)["']/i) || [])[1] || '(none)';
		const method = (match[0].match(/method=["']([^"']+)["']/i) || [])[1] || 'GET';
		const inputs = [];
		const inputRegex = /<input[^>]+>/gi;
		let inp;
		while ((inp = inputRegex.exec(match[0])) !== null) {
			const name = (inp[0].match(/name=["']([^"']+)["']/i) || [])[1];
			const type = (inp[0].match(/type=["']([^"']+)["']/i) || [])[1] || 'text';
			if (name) inputs.push(`${name} [${type}]`);
		}
		forms.push({ action, method, inputs });
	}
	return forms;
}

// ================================
// MAIN HANDLER
// ================================
let handler = async (m, { text, usedPrefix, command }) => {
	if (!text) throw `Masukkan URL!\nContoh: *${usedPrefix + command}* https://example.com`;

	let url = text.trim();
	if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

	m.react('⏳');

	let res;
	try {
		res = await axios.get(url, {
			timeout: 20000,
			maxRedirects: 10,
			validateStatus: () => true,
			responseType: 'text',
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
				'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
				'Accept-Encoding': 'gzip, deflate, br',
				'Connection': 'keep-alive',
				'Upgrade-Insecure-Requests': '1',
				'Sec-Fetch-Dest': 'document',
				'Sec-Fetch-Mode': 'navigate',
				'Sec-Fetch-Site': 'none',
				'Cache-Control': 'max-age=0',
			},
		});
	} catch (e) {
		m.react('❌');
		throw `Gagal scrape: ${e.message}`;
	}

	const html = typeof res.data === 'string' ? res.data : String(res.data);
	const contentType = res.headers['content-type'] || '';
	const statusCode = res.status;
	const finalUrl = res.request?.res?.responseUrl || url;
	const size = Buffer.byteLength(html, 'utf-8');

	// Parse
	const meta = extractMeta(html);
	const links = extractLinks(html, finalUrl);
	const forms = extractForms(html);
	const bodyText = stripHtml(html).slice(0, 1500);

	// Build output
	let out = '';
	out += `🌐 *SCRAPE RESULT*\n`;
	out += `━━━━━━━━━━━━━━━━━━━\n`;
	out += `🔗 *URL:* ${finalUrl}\n`;
	out += `📊 *Status:* ${statusCode}\n`;
	out += `📄 *Content-Type:* ${contentType.split(';')[0]}\n`;
	out += `📦 *Size:* ${(size / 1024).toFixed(2)} KB\n\n`;

	// Meta
	out += `📋 *META INFO*\n`;
	if (meta.title)       out += `• Title: ${meta.title}\n`;
	if (meta.ogTitle)     out += `• OG Title: ${meta.ogTitle}\n`;
	if (meta.description) out += `• Description: ${meta.description}\n`;
	if (meta.ogDesc)      out += `• OG Desc: ${meta.ogDesc}\n`;
	if (meta.ogImage)     out += `• OG Image: ${meta.ogImage}\n`;
	if (!meta.title && !meta.description) out += `• (tidak ada meta)\n`;
	out += `\n`;

	// Forms
	if (forms.length > 0) {
		out += `📝 *FORMS (${forms.length})*\n`;
		forms.slice(0, 5).forEach((f, i) => {
			out += `• Form ${i + 1}: ${f.method.toUpperCase()} → ${f.action}\n`;
			if (f.inputs.length) out += `  Inputs: ${f.inputs.join(', ')}\n`;
		});
		out += `\n`;
	}

	// Links
	if (links.length > 0) {
		out += `🔗 *LINKS (${Math.min(links.length, 10)} dari ${links.length})*\n`;
		links.slice(0, 10).forEach(l => out += `• ${l}\n`);
		out += `\n`;
	}

	// Body text
	out += `📜 *BODY TEXT (preview)*\n`;
	out += bodyText || '(tidak ada konten teks)';

	m.react('✅');

	// Kalau terlalu panjang kirim sebagai dokumen txt
	if (out.length > 4000) {
		const buf = Buffer.from(out, 'utf-8');
		await conn.sendMessage(m.chat, {
			document: buf,
			mimetype: 'text/plain',
			fileName: `scrape-${Date.now()}.txt`,
			caption: `✅ Hasil scrape *${finalUrl}*\n📦 Terlalu panjang, dikirim sebagai file.`,
		}, { quoted: m });
	} else {
		await m.reply(out);
	}
};

handler.help = ['scrape <url>'];
handler.tags = ['owner'];
handler.command = /^scrape$/i;
handler.owner = true;

export default handler;