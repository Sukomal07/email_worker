export function getEmailBody(template, replacements) {
    let cleanedTemplate = template.replace(/\s+/g, ' ').trim();
    for (const [key, value] of Object.entries(replacements)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        cleanedTemplate = cleanedTemplate.replace(regex, value ?? '');
    }
    return cleanedTemplate;
}