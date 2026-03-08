import fs from 'node:fs';

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const replaceMarkdownSection = (content, heading, replacement) => {
  const headingMarker = `${heading}\n`;
  const headingIndex = content.indexOf(headingMarker);

  if (headingIndex === -1) {
    return `${content.trimEnd()}\n\n${heading}\n${replacement.trimEnd()}\n`;
  }

  const sectionStart = headingIndex + headingMarker.length;
  const nextHeadingIndex = content.indexOf('\n## ', sectionStart);
  const sectionEnd = nextHeadingIndex === -1 ? content.length : nextHeadingIndex;

  return `${content.slice(0, sectionStart)}${replacement.trimEnd()}\n${content.slice(sectionEnd)}`;
};

export const assertSingleHeading = (content, heading) => {
  const escapedHeading = escapeRegExp(heading);
  const matches = content.match(new RegExp(`^${escapedHeading}$`, 'gm')) ?? [];
  if (matches.length > 1) {
    throw new Error(`Duplicate "${heading}" sections found in contexts/state.md`);
  }
};

export const writeProjectStateSections = ({ statePath, sections }) => {
  return writeMarkdownSections({ filePath: statePath, sections });
};

export const writeMarkdownSections = ({ filePath, sections }) => {
  let content = fs.readFileSync(filePath, 'utf8');

  for (const { heading } of sections) {
    assertSingleHeading(content, heading);
  }

  for (const { heading, replacement } of sections) {
    content = replaceMarkdownSection(content, heading, replacement);
  }

  fs.writeFileSync(filePath, content);
  return content;
};
