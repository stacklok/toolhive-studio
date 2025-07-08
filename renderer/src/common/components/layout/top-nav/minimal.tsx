import { TopNavContainer } from './container'
import { WindowControls } from './window-controls'

export function TopNavMinimal() {
  return (
    <TopNavContainer className="fixed top-0 !flex justify-between">
      <WindowControls />
    </TopNavContainer>
  )
}
