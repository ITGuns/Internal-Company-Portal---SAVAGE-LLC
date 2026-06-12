let nextEscapeLayerId = 0;
const escapeLayerStack: number[] = [];

export function createEscapeLayerId() {
  nextEscapeLayerId += 1;
  return nextEscapeLayerId;
}

export function addEscapeLayer(id: number) {
  escapeLayerStack.push(id);
}

export function removeEscapeLayer(id: number) {
  const index = escapeLayerStack.lastIndexOf(id);
  if (index >= 0) {
    escapeLayerStack.splice(index, 1);
  }
}

export function isTopEscapeLayer(id: number) {
  return escapeLayerStack[escapeLayerStack.length - 1] === id;
}

export function __resetEscapeLayersForTests() {
  nextEscapeLayerId = 0;
  escapeLayerStack.length = 0;
}
