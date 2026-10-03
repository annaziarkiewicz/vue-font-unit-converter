import {
    computed,
    onBeforeUnmount,
    onMounted,
    ref
} from 'vue'

import type {
    ConverterValues,
    InputKey
} from '@/types/fontUnitConverter'

const errorMessages = {
    aboveMax: (max: number) => `Maximum value: ${max}.`,
    belowMin: (min: number) => `Minimum value: ${min}.`,
    empty: 'Enter a number.',
    invalidFormat: 'Invalid number format.',
    invalidNumber: 'Enter a valid number.',
    tooManyDecimals: (decimalPlaces: number) => `Maximum decimal places: ${decimalPlaces}.`
}

const getConvertedValues = (
    px: number,
    base: number,
    viewportWidth: number
): Omit<ConverterValues, 'base'> => {
    const em = Number((px / base).toFixed(4))

    return {
        em,
        percent: Number(((px / base) * 100).toFixed(2)),
        px: Number(px.toFixed(2)),
        rem: em,
        vw: Number(((px / viewportWidth) * 100).toFixed(4))
    }
}

const createInitialValues = (viewportWidth: number): ConverterValues => {
    const base = 12
    const px = 32

    return {
        base,
        ...getConvertedValues(px, base, viewportWidth)
    }
}

export const useFontUnitConverter = () => {
    const baseFontSizeMinimum = 1
    const baseFontSizeMaximum = 512
    const baseFontSizeDecimalPlaces = 2

    const viewportWidth = ref(window.innerWidth)

    const values = ref<ConverterValues>(createInitialValues(viewportWidth.value))

    const typingKey = ref<InputKey | null>(null)
    const baseKey = ref<InputKey>('px')
    const lastInputKey = ref<InputKey>('px')
    const announcement = ref('')
    const conversionPaused = ref(false)

    let announcementTimeout: ReturnType<typeof setTimeout> | undefined

    const isBaseValid = computed(() => {
        const base = Number(values.value.base)

        return values.value.base !== ''
            && Number.isFinite(base)
            && base >= baseFontSizeMinimum
            && base <= baseFontSizeMaximum
            && Number(base.toFixed(baseFontSizeDecimalPlaces)) === base
    })

    const inputSettings = computed(() => {
        return {
            base: {
                decimalPlaces: baseFontSizeDecimalPlaces,
                max: baseFontSizeMaximum,
                min: baseFontSizeMinimum,
                step: 1
            },
            em: {
                decimalPlaces: 4,
                max: undefined,
                min: 0,
                step: .1
            },
            percent: {
                decimalPlaces: 2,
                max: undefined,
                min: 0,
                step: 1
            },
            px: {
                decimalPlaces: 2,
                max: undefined,
                min: 0,
                step: 1
            },
            rem: {
                decimalPlaces: 4,
                max: undefined,
                min: 0,
                step: .1
            },
            vw: {
                decimalPlaces: 4,
                max: undefined,
                min: 0,
                step: .1
            }
        }
    })

    const getErrorMessage = (
        reason: keyof typeof errorMessages,
        key: InputKey
    ) => {
        const { decimalPlaces, max, min } = inputSettings.value[key]
        let message: string

        if (reason === 'aboveMax' && max !== undefined) {
            message = errorMessages.aboveMax(max)
        } else if (reason === 'belowMin') {
            message = errorMessages.belowMin(min)
        } else if (reason === 'tooManyDecimals') {
            message = errorMessages.tooManyDecimals(decimalPlaces)
        } else if (reason === 'invalidFormat') {
            message = errorMessages.invalidFormat
        } else {
            message = reason === 'empty' ? errorMessages.empty : errorMessages.invalidNumber
        }

        return message
    }

    const setConversionPaused = (paused: boolean) => {
        conversionPaused.value = paused

        if (paused) {
            clearTimeout(announcementTimeout)
            announcement.value = ''
        }
    }

    const announceResults = () => {
        clearTimeout(announcementTimeout)
        announcement.value = ''

        if (conversionPaused.value) {
            return
        }

        announcementTimeout = setTimeout(() => {
            if (Object.values(values.value).some((value) => {
                return value === ''
            })) {
                return
            }

            if (!isBaseValid.value) {
                return
            }

            announcement.value = `Results: ${values.value.px} pixels, ${values.value.em} em, ${values.value.rem} rem, ${values.value.percent} percent, ${values.value.vw} viewport width units.`
        }, 500)
    }

    const clearConvertedValues = () => {
        values.value.px = ''
        values.value.em = ''
        values.value.rem = ''
        values.value.percent = ''
        values.value.vw = ''
    }

    const recalcFrom = (source: InputKey) => {
        const basePx = Number(values.value.base)

        if (conversionPaused.value || !isBaseValid.value) {
            return
        }

        if (values.value[source] === '') {
            clearConvertedValues()
            return
        }

        let px = Number(values.value.px)

        if (source === 'em') {
            px = Number(values.value.em) * basePx
        }

        if (source === 'rem') {
            px = Number(values.value.rem) * basePx
        }

        if (source === 'percent') {
            px = (Number(values.value.percent) / 100) * basePx
        }

        if (source === 'vw') {
            px = (Number(values.value.vw) / 100) * viewportWidth.value
        }

        if (!Number.isFinite(px) || px < 0) {
            clearConvertedValues()
            return
        }

        const sourceValue = values.value[source]

        Object.assign(
            values.value,
            getConvertedValues(px, basePx, viewportWidth.value)
        )

        if (source !== 'base') {
            values.value[source] = sourceValue
        }
    }

    const onFocus = (key: InputKey) => {
        typingKey.value = key
    }

    const onBlur = () => {
        typingKey.value = null
    }

    const onInput = (key: InputKey) => {
        if (key === 'base') {
            baseKey.value = 'base'

            if (isBaseValid.value) {
                recalcFrom(lastInputKey.value)
            }
        } else {
            baseKey.value = key
            lastInputKey.value = key

            if (isBaseValid.value) {
                recalcFrom(key)
            }
        }

        announceResults()
    }

    const uiState = (key: InputKey) => {
        if (typingKey.value === key) {
            return 'typing'
        }

        if (baseKey.value === key) {
            return 'base'
        }

        if (key === 'base') {
            return 'constant'
        }

        return 'output'
    }

    const uiText = (key: InputKey) => {
        const state = uiState(key)

        return state === 'base' ? 'base input' : state
    }

    const resetValues = () => {
        clearTimeout(announcementTimeout)

        const initialValues = createInitialValues(viewportWidth.value)

        values.value = initialValues
        baseKey.value = 'px'
        lastInputKey.value = 'px'
        typingKey.value = null
        conversionPaused.value = false
        announcement.value = `Reset complete. Base font size: ${initialValues.base} pixels. Font size: ${initialValues.px} pixels.`
    }

    const handleResize = () => {
        viewportWidth.value = window.innerWidth
        recalcFrom(lastInputKey.value)
    }

    onMounted(() => {
        window.addEventListener('resize', handleResize)
    })

    onBeforeUnmount(() => {
        clearTimeout(announcementTimeout)
        window.removeEventListener('resize', handleResize)
    })

    return {
        announcement,
        baseFontSizeDecimalPlaces,
        baseFontSizeMaximum,
        baseFontSizeMinimum,
        getErrorMessage,
        inputSettings,
        isBaseValid,
        lastInputKey,
        onBlur,
        onFocus,
        onInput,
        resetValues,
        setConversionPaused,
        uiState,
        uiText,
        values
    }
}