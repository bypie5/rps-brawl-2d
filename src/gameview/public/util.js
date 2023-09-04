/**
 * Finds the nearest width and height to the target aspect ratio. The new
 * width and height will be less than or equal to the original width and
 * height.
 * @param targetAspectRatio - width / height
 * @param width - original width
 * @param height - original height
 */
function nearestToAspectRatio(targetAspectRatio, width, height) {
  let aspectRatio = width / height
  if (aspectRatio > targetAspectRatio) {
    return { width: Math.floor(height * targetAspectRatio), height }
  } else {
    return { width, height: Math.floor(width / targetAspectRatio) }
  }
}

export { nearestToAspectRatio }
