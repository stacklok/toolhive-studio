import { DISCORD_URL } from '@common/app-info'

export function LinkErrorDiscord() {
  return (
    <a
      href={DISCORD_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="text-destructive hover:text-destructive/80 underline"
    >
      Discord
    </a>
  )
}
