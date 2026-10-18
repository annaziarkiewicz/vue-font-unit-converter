import {
    computed,
    onBeforeUnmount,
    onBeforeUpdate,
    ref,
    shallowRef,
    useAttrs,
    useId,
    watch
} from 'vue'

import type { Ref } from 'vue'

type FieldElement = HTMLInputElement | HTMLTextAreaElement

type FocusOrigin = 'keyboard' | 'mouse'

type DocumentFocusState = {
    fields: Map<FieldElement, (origin: FocusOrigin) => void>
    onKeyDown: (event: KeyboardEvent) => void
    onPointerDown: (event: PointerEvent) => void
    origin: FocusOrigin
    pointerTarget: EventTarget | null
    pointerTimeout?: ReturnType<typeof setTimeout>
}

const documentStates = new WeakMap<Document, DocumentFocusState>()

const getDocumentState = (ownerDocument: Document) => {
    const existingState = documentStates.get(ownerDocument)

    if (existingState) {
        return existingState
    }

    const state: DocumentFocusState = {
        fields: new Map(),
        onKeyDown: (event) => {
            if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) {
                return
            }

            state.origin = 'keyboard'
            state.pointerTarget = null
        },
        onPointerDown: (event) => {
            state.origin = 'mouse'
            state.pointerTarget = event.target
            state.fields.forEach(setOrigin => setOrigin('mouse'))
            clearTimeout(state.pointerTimeout)
            state.pointerTimeout = setTimeout(() => {
                state.pointerTarget = null
            }, 0)
        },
        origin: 'keyboard',
        pointerTarget: null
    }

    ownerDocument.addEventListener('keydown', state.onKeyDown, true)
    ownerDocument.addEventListener('pointerdown', state.onPointerDown, true)
    documentStates.set(ownerDocument, state)

    return state
}

export const useFieldFocus = (fieldRef: Readonly<Ref<FieldElement | null>>) => {
    const keyboardFocused = ref(false)
    let field: FieldElement | null = null
    let documentState: DocumentFocusState | undefined
    let requestedOrigin: FocusOrigin | undefined

    const setOrigin = (origin: FocusOrigin) => {
        keyboardFocused.value = origin === 'keyboard'
    }

    const getFocusOrigin = (): FocusOrigin => {
        return keyboardFocused.value ? 'keyboard' : 'mouse'
    }

    const onFocus = () => {
        const pointerTarget = documentState?.pointerTarget
        const clickedLabel = field?.labels && Array.from(field.labels).some((label) => {
            return pointerTarget instanceof Node && label.contains(pointerTarget)
        })
        const origin = requestedOrigin
            ?? (pointerTarget === field || clickedLabel ? 'mouse' : documentState?.origin ?? 'keyboard')

        requestedOrigin = undefined
        setOrigin(origin)

        if (documentState) {
            documentState.origin = origin
        }
    }

    const onBlur = () => {
        keyboardFocused.value = false
    }

    const onFocusOrigin = (event: Event) => {
        const origin = (event as CustomEvent<unknown>).detail

        if ((origin !== 'keyboard' && origin !== 'mouse') || !documentState || !field) {
            return
        }

        requestedOrigin = origin
        documentState.origin = origin

        if (field.ownerDocument.activeElement === field) {
            setOrigin(origin)
            requestedOrigin = undefined
        }
    }

    const focusField = (openedBy?: FocusOrigin) => {
        const element = fieldRef.value

        if (!element) {
            return
        }

        const origin = openedBy ?? documentState?.origin ?? 'keyboard'

        element.dispatchEvent(new CustomEvent('ad2m:focus-origin', {
            detail: origin
        }))
        element.focus()
    }

    const detachField = () => {
        if (!field || !documentState) {
            return
        }

        field.removeEventListener('focus', onFocus)
        field.removeEventListener('blur', onBlur)
        field.removeEventListener('ad2m:focus-origin', onFocusOrigin)
        documentState.fields.delete(field)

        if (documentState.fields.size === 0) {
            const ownerDocument = field.ownerDocument

            ownerDocument.removeEventListener('keydown', documentState.onKeyDown, true)
            ownerDocument.removeEventListener('pointerdown', documentState.onPointerDown, true)
            clearTimeout(documentState.pointerTimeout)
            documentStates.delete(ownerDocument)
        }

        field = null
        documentState = undefined
        requestedOrigin = undefined
        keyboardFocused.value = false
    }

    watch(fieldRef, (element) => {
        detachField()
        field = element

        if (!field) {
            return
        }

        documentState = getDocumentState(field.ownerDocument)
        documentState.fields.set(field, setOrigin)
        field.addEventListener('focus', onFocus)
        field.addEventListener('blur', onBlur)
        field.addEventListener('ad2m:focus-origin', onFocusOrigin)

        if (field.ownerDocument.activeElement === field) {
            onFocus()
        }
    }, { flush: 'post', immediate: true })

    onBeforeUnmount(detachField)

    return {
        focusField,
        getFocusOrigin,
        keyboardFocused
    }
}

export const useFieldAccessibility = (
    getError: () => string,
    getShowErrorMessage: () => boolean = () => true
) => {
    const attrs = useAttrs()
    const generatedId = useId()
    const accessibilityAttrs = shallowRef({ ...attrs })

    const fieldId = computed(() => String(accessibilityAttrs.value.id || generatedId))
    const errorDescriptionId = computed(() => {
        return getShowErrorMessage() ? `${fieldId.value}-error` : undefined
    })
    const describedBy = computed(() => {
        return [accessibilityAttrs.value['aria-describedby'], getError() ? errorDescriptionId.value : '']
            .filter(Boolean)
            .join(' ') || undefined
    })
    const ariaInvalid = computed<'true' | 'false' | 'grammar' | 'spelling' | undefined>(() => {
        const value = accessibilityAttrs.value['aria-invalid']

        if (getError() || value === true || value === 'true') {
            return 'true'
        }

        if (value === false) {
            return 'false'
        }

        return value === 'false' || value === 'grammar' || value === 'spelling' ? value : undefined
    })

    onBeforeUpdate(() => {
        if (['id', 'aria-describedby', 'aria-invalid'].some((key) => {
            return attrs[key] !== accessibilityAttrs.value[key]
        })) {
            accessibilityAttrs.value = { ...attrs }
        }
    })

    return {
        ariaInvalid,
        describedBy,
        errorDescriptionId,
        fieldId
    }
}