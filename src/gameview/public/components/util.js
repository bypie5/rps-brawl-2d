function truncateWithEllipsis(str, len) {
  if (str.length <= len) {
    return str;
  }
  return str.substr(0, len) + '...';
}

export { truncateWithEllipsis }