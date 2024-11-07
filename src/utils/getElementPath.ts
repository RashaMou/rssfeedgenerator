const getElementPath = (element: HTMLElement) => {
  const path = [];
  let current = element;

  // Stop when we hit <body> or if there's no parent
  while (
    current &&
    current.tagName.toLowerCase() !== "body" &&
    current.parentElement
  ) {
    path.unshift(current.tagName.toLowerCase());
    current = current.parentElement;
  }

  path.unshift("body");
  return path.join(" > ");
};

export default getElementPath;
