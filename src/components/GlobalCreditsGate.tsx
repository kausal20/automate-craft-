/* LOGIC EXPLAINED:
The credits UI has been removed, but the surrounding layout still imports this
gate component. Returning `null` keeps the layout stable without rendering any
credits button UI, while leaving the underlying credits logic and modals in the
rest of the app untouched.
*/

export default function GlobalCreditsGate() {
  return null;
}
