import React from "react";

function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|`([^`]+?)`|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // **bold**
      parts.push(<strong key={match.index}>{match[2]}</strong>);
    } else if (match[3]) {
      // `code`
      parts.push(
        <code key={match.index} className="bg-muted px-1 py-0.5 rounded font-mono text-xs">
          {match[3]}
        </code>
      );
    } else if (match[4]) {
      // *italic*
      parts.push(<em key={match.index}>{match[4]}</em>);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export function MarkdownPreview({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="list-disc list-inside ml-2 space-y-0.5">
          {listItems.map((item, i) => (
            <li key={i}>{parseInline(item.replace(/^[-*]\s?/, ""))}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.match(/^[-*]\s/)) {
      listItems.push(line);
      continue;
    }

    flushList();

    if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="font-semibold text-sm mt-2 mb-1">
          {parseInline(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="font-semibold text-base mt-2 mb-1">
          {parseInline(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="font-bold text-lg mt-2 mb-1">
          {parseInline(line.slice(2))}
        </h1>
      );
    } else {
      elements.push(
        <p key={i} className="text-sm leading-relaxed">
          {parseInline(line)}
        </p>
      );
    }
  }

  flushList();

  return <div className="space-y-1">{elements}</div>;
}
