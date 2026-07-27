// CSS/SCSS module declarations
declare module '*.scss' {
  const content: Record<string, string>
  export default content
}
declare module '*.css' {
  const content: Record<string, string>
  export default content
}

// Telegram auth callback on window
interface Window {
  __telegramAuthCallback?: (user: Record<string, unknown>) => void
}
