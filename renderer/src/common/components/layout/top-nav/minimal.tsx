import { TopNavContainer } from './container'
import { QuitConfirmationListener } from './quit-confirmation-listener'
import { WindowControls } from './window-controls'

export function TopNavMinimal() {
  return (
    <TopNavContainer className="fixed top-0 !flex justify-end">
      <WindowControls />
      <QuitConfirmationListener />
    </TopNavContainer>
  )
}
