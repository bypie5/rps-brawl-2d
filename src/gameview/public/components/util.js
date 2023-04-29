function truncateWithEllipsis(str, len) {
  if (str.length <= len) {
    return str;
  }
  return str.substr(0, len) + '...';
}

function ticksToSeconds(ticks, fps = 30) {
  return ticks * (fps / 1000)
}


function setToDecimalPlaces(num, places) {
  return Number(num.toFixed(places))
}

export { truncateWithEllipsis, ticksToSeconds, setToDecimalPlaces }