const paths = {
  mark: `<path d="M12 1.75c.55 5.65 4.6 9.7 10.25 10.25-5.65.55-9.7 4.6-10.25 10.25C11.45 16.6 7.4 12.55 1.75 12 7.4 11.45 11.45 7.4 12 1.75Z" fill="currentColor"/><circle cx="19.2" cy="4.8" r="2.1" fill="currentColor"/>`,
  text: `<path d="M4 6h16M4 12h11M4 18h7"/><path d="M18 15v6M15 18h6"/>`,
  multimodal: `<rect x="3" y="4" width="12" height="12" rx="2"/><circle cx="16.5" cy="15.5" r="4.5"/>`,
  speech: `<path d="M3 10v4M7 7v10M11 3.5v17M15 7.5v9M19 9.5v5M21.5 11v2"/>`,
  image: `<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.25" cy="9.25" r="1.65"/><path d="m4 17 5.1-5.1 4 4 3.4-3.4L21 16.7"/>`,
  video: `<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10.2 9.1 4.8 2.9-4.8 2.9V9.1Z"/>`,
  search: `<circle cx="10.75" cy="10.75" r="6.25"/><path d="m15.5 15.5 4.5 4.5"/>`,
  menu: `<path d="M4 7h16M4 12h16M4 17h16"/>`,
  home: `<path d="m3 10.5 9-7 9 7"/><path d="M5.5 9.5V20h4.5v-5h4v5H18.5V9.5"/>`,
  arrowRight: `<path d="M4 12h15M13 6l6 6-6 6"/>`,
  arrowUpRight: `<path d="M7 17 17 7M8 7h9v9"/>`,
  chevronDown: `<path d="m6 9 6 6 6-6"/>`,
  copy: `<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5v-2a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/>`,
  check: `<path d="m5 12.5 4.2 4.2L19 6.7"/>`,
  dot: `<circle cx="12" cy="12" r="4" fill="currentColor"/>`,
  info: `<circle cx="12" cy="12" r="8.5"/><path d="M12 10.5V17M12 7.4v.2"/>`,
  close: `<path d="m6 6 12 12M18 6 6 18"/>`,
  filter: `<path d="M4 7h16M7 12h10M10 17h4"/>`,
};

export function icon(name, className = "") {
  const path = paths[name];
  if (!path) throw new Error(`Unknown icon: ${name}`);
  return `<svg class="icon${className ? ` ${className}` : ""}" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${path}</svg>`;
}

export const categoryIcons = {
  text: paths.text,
  multimodal: paths.multimodal,
  speech: paths.speech,
  image: paths.image,
  video: paths.video,
};
