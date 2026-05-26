const formatBytes = (bytes: number | string | null | undefined): string => {
  if (bytes === null || bytes === undefined) return '—';
  const num = Number(bytes);
  if (Number.isNaN(num)) return '—';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  if (num < 1024 * 1024 * 1024) return `${(num / 1024 / 1024).toFixed(1)} MB`;
  return `${(num / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

export { formatBytes };
