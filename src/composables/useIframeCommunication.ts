import { onBeforeUnmount, onMounted } from 'vue'

type ModalOpenedBy = 'keyboard' | 'mouse'

export const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
].join(',')

export const useIframeCommunication = () => {
    const isIframe = window.parent !== window

    const getParentOrigin = (): string | null => {
        if (!document.referrer) return null

        try {
            return new URL(document.referrer).origin
        } catch {
            return null
        }
    }

    const parentOrigin = getParentOrigin()

    const focusFirstElement = (openedBy?: ModalOpenedBy): void => {
        const focusableElements = Array.from(
            document.querySelectorAll<HTMLElement>(focusableSelector)
        ).filter(element => !element.hidden)
        const firstFocusableElement = focusableElements[0]

        if (!firstFocusableElement) return

        if (openedBy === 'keyboard' || openedBy === 'mouse') {
            firstFocusableElement.dispatchEvent(new CustomEvent('ad2m:focus-origin', {
                detail: openedBy
            }))
        }

        if (openedBy === 'mouse') {
            firstFocusableElement.focus({ focusVisible: false })
            return
        }

        if (openedBy === 'keyboard') {
            firstFocusableElement.focus({ focusVisible: true })
            return
        }

        firstFocusableElement.focus()
    }

    const handleMessage = (event: MessageEvent): void => {
        if (
            !isIframe
            || !parentOrigin
            || event.source !== window.parent
            || event.origin !== parentOrigin
            || event.data?.type !== 'ad2m:modal-ready'
        ) return

        focusFirstElement(event.data.openedBy)
    }

    const closeModal = (): void => {
        if (!isIframe || !parentOrigin) return

        window.parent.postMessage(
            { type: 'ad2m:modal-close' },
            parentOrigin
        )
    }

    const handleKeydown = (event: KeyboardEvent): void => {
        if (
            event.key !== 'Escape'
            || event.defaultPrevented
        ) return

        closeModal()
    }

    onMounted(() => {
        if (!isIframe) return

        window.addEventListener('message', handleMessage)
        document.addEventListener('keydown', handleKeydown)
    })

    onBeforeUnmount(() => {
        window.removeEventListener('message', handleMessage)
        document.removeEventListener('keydown', handleKeydown)
    })

    return {
        closeModal,
        isIframe
    }
}