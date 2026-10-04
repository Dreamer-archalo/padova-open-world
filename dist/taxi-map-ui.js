// Keep the custom destination at the top of the taxi list. The confirmation
// button belongs to TaxiMenuController/taxi-confirmation-runtime alone: a
// capture listener here used to disable it before its click handler could run.
const menuContent = document.getElementById('menuContent');

function promoteChooseYourself() {
  const choose = document.getElementById('taxiChoose');
  const activities = choose?.closest('.activities');
  if (choose && activities && activities.firstElementChild !== choose) activities.prepend(choose);
}

if (menuContent) new MutationObserver(promoteChooseYourself)
  .observe(menuContent, {childList: true, subtree: true});

// Space works when focus is elsewhere in the confirmation dialog. The native
// button already handles Space/Enter when it has focus.
window.addEventListener('keydown', event => {
  if (event.code !== 'Space' || event.repeat) return;
  const confirm = document.getElementById('confirmTaxi');
  const menu = document.getElementById('menu');
  if (!confirm || !menu?.open || confirm.disabled || document.activeElement === confirm) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  confirm.click();
}, true);
