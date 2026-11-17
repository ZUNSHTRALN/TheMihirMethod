export function moveLightingToggle(toggle, worldToolbar, panelTools, closeButton, inPanel) {
  if (inPanel) panelTools.insertBefore(toggle, closeButton);
  else worldToolbar.append(toggle);
}
