const cheerio = require('cheerio');

function parseTranscript(html) {
  const $ = cheerio.load(html);
  const messages = [];

  $('.chatlog__message-group').each((_, group) => {
    const avatar = $(group).find('.chatlog__author-avatar').attr('src') || 'https://cdn.discordapp.com/embed/avatars/0.png';
    const author = $(group).find('.chatlog__author-name').text().trim() || 'Desconhecido';

    $(group).find('.chatlog__message').each((_, msg) => {
      const contentHtml = $(msg).find('.chatlog__content').html() || '';
      const $content = cheerio.load(contentHtml.replace(/<br\s*[\/]?>/gi, '\n'));
      let content = $content.text().trim();
      
      const attachments = [];
      $(msg).find('.chatlog__attachment img, .chatlog__attachment video, .chatlog__attachment a').each((_, el) => {
        const src = $(el).attr('src');
        const href = $(el).attr('href');
        if (href && !attachments.includes(href)) {
            attachments.push(href);
        } else if (src && !attachments.includes(src)) {
            attachments.push(src);
        }
      });

      if (attachments.length > 0) {
         content += '\n' + attachments.join('\n');
      }

      content = content.trim();

      if (content.length > 0) {
        messages.push({ author, avatar, content });
      }
    });
  });

  return messages;
}

module.exports = { parseTranscript };
