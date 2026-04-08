import { DISCORD_URL } from '@common/app-info'

export function LinkErrorDiscord() {
  return (
    <a
      href={DISCORD_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="text-red-300 underline hover:text-red-200"
    >
      Discord
    </a>
  )
}
