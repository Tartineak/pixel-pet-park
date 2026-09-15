import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * 只保留项目实际用到的能力：去掉了 next-themes 和 lucide 图标依赖。
 * 本站是固定亮色主题，不需要跟随系统主题切换。
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
