<template>
    <div
        class="az-input"
        :style="inputStyle"
    >
        <label
            v-if="label || $slots.label"
            class="az-input__label"
            :for="inputId"
        >
            <slot name="label">{{ label }}</slot>
        </label>

        <div
            class="az-input__field"
            :class="{
                'az-input__field--error': hasError,
                'az-input__field--keyboard-focus': inputKeyboardFocused,
                'az-input__field--with-slot': $slots.append
            }"
        >
            <input
                ref="inputRef"
                v-bind="$attrs"
                :id="inputId"
                :value="displayValue"
                class="az-input__value"
                :aria-describedby="describedBy"
                :aria-invalid="ariaInvalid"
                :max="max"
                :min="min"
                :step="step"
                :type="type"
                @blur="onInputBlur"
                @focus="onInputFocus"
                @input="updateValue"
            />

            <div
                v-if="$slots.append"
                class="az-input__append"
            >
                <slot name="append" />
            </div>
        </div>

        <div
            v-if="error && showErrorMessage"
            :id="errorDescriptionId"
            class="az-input__error"
            aria-live="polite"
        >
            <span
                v-if="errorPrefix"
                class="az-input__error-prefix"
            >{{ errorPrefix }}:</span> {{ error }}
        </div>
    </div>
</template>

<script lang="ts" setup>
import {
    computed,
    onBeforeUnmount,
    onMounted,
    ref,
    useAttrs,
    useId,
    useTemplateRef,
    watch
} from 'vue'

type NumberInputError = 'empty' | 'invalidFormat' | 'invalidNumber' | 'belowMin' | 'aboveMax' | 'tooManyDecimals'

defineOptions({ inheritAttrs: false })

const {
    borderColor,
    error = '',
    errorColor,
    errorPrefix = 'Error',
    focusColor,
    label = '',
    max,
    maxDecimalPlaces,
    min,
    restoreInvalidValue = true,
    showErrorMessage = true,
    step,
    type = 'text'
} = defineProps<{
    borderColor?: string
    error?: string
    errorColor?: string
    errorPrefix?: string
    focusColor?: string
    label?: string
    max?: number
    maxDecimalPlaces?: number
    min?: number
    restoreInvalidValue?: boolean
    showErrorMessage?: boolean
    step?: number | string
    type?: 'text' | 'number' | 'email' | 'password' | 'search' | 'tel' | 'url'
}>()

const emit = defineEmits<{
    blur: [event: FocusEvent]
    focus: [event: FocusEvent]
    input: [event: Event]
    invalid: [reason: NumberInputError]
    valid: []
}>()

const model = defineModel<string | number>({ required: true })

const inputRef = useTemplateRef<HTMLInputElement>('inputRef')
const attrs = useAttrs()
const generatedId = useId()
const displayValue = ref(String(model.value ?? ''))
const inputKeyboardFocused = ref(false)
const keyboardNavigation = ref(false)
let lastValidInputValue = String(model.value ?? '')

const inputId = computed(() => {
    return String(attrs.id || generatedId)
})

const errorDescriptionId = computed(() => {
    return showErrorMessage
        ? `${inputId.value}-error`
        : undefined
})

const describedBy = computed(() => {
    return [attrs['aria-describedby'], error ? errorDescriptionId.value : '']
        .filter(Boolean)
        .join(' ') || undefined
})

const ariaInvalid = computed<
    'true' | 'false' | 'grammar' | 'spelling' | undefined
>(() => {
    if (error || attrs['aria-invalid'] === 'true') {
        return 'true'
    }

    const value = attrs['aria-invalid']

    return value === 'false' || value === 'grammar' || value === 'spelling' ? value : undefined
})

const hasError = computed(() => {
    return ariaInvalid.value === 'true'
})

const hasNumberConstraints = computed(() => {
    return type === 'number'
        && (min !== undefined || max !== undefined || maxDecimalPlaces !== undefined)
})

const inputStyle = computed(() => {
    return {
        '--input-border-color': borderColor,
        '--input-error-color': errorColor,
        '--input-focus-color': focusColor
    }
})

const focusInput = (openedBy?: 'keyboard' | 'mouse') => {
    if (openedBy) {
        inputRef.value?.dispatchEvent(new CustomEvent('ad2m:focus-origin', {
            detail: openedBy
        }))
    }

    inputRef.value?.focus()
}

const onInputFocus = (event: FocusEvent) => {
    inputKeyboardFocused.value = keyboardNavigation.value
    emit('focus', event)
}

const onFocusOrigin = (event: Event) => {
    const openedBy = (event as CustomEvent<unknown>).detail

    if (openedBy !== 'keyboard' && openedBy !== 'mouse') {
        return
    }

    keyboardNavigation.value = openedBy === 'keyboard'

    if (document.activeElement === inputRef.value) {
        inputKeyboardFocused.value = keyboardNavigation.value
    }
}

const onKeyDown = () => {
    keyboardNavigation.value = true
}

const onPointerDown = () => {
    keyboardNavigation.value = false
    inputKeyboardFocused.value = false
}

const getNumberInputError = (inputValue: string): NumberInputError | null => {
    if (inputValue === '') {
        return 'empty'
    }

    const value = Number(inputValue)

    if (!Number.isFinite(value)) {
        return 'invalidNumber'
    }

    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(inputValue)) {
        return 'invalidFormat'
    }

    if (min !== undefined && value < min) {
        return 'belowMin'
    }

    if (max !== undefined && value > max) {
        return 'aboveMax'
    }

    if (maxDecimalPlaces !== undefined
        && (inputValue.split('.')[1]?.length ?? 0) > maxDecimalPlaces) {
        return 'tooManyDecimals'
    }

    return null
}

const updateValue = (event: Event) => {
    const input = event.target as HTMLInputElement

    displayValue.value = input.value

    if (!hasNumberConstraints.value) {
        lastValidInputValue = input.value
        model.value = type === 'number'
            && input.value !== ''
            && Number.isFinite(input.valueAsNumber)
            ? input.valueAsNumber
            : input.value
    }

    emit('input', event)
}

const onInputBlur = (event: FocusEvent) => {
    inputKeyboardFocused.value = false

    const input = event.target as HTMLInputElement

    if (hasNumberConstraints.value) {
        const reason = input.validity.badInput
            ? 'invalidFormat'
            : getNumberInputError(input.value)

        if (reason !== null && !restoreInvalidValue) {
            emit('invalid', reason)
        } else {
            if (reason === null) {
                lastValidInputValue = String(input.valueAsNumber)
            } else if (getNumberInputError(lastValidInputValue) !== null) {
                lastValidInputValue = ''
            }

            input.value = lastValidInputValue
            displayValue.value = lastValidInputValue
            model.value = lastValidInputValue === '' ? '' : Number(lastValidInputValue)

            if (reason === null) {
                emit('valid')
            } else {
                emit('invalid', reason)
            }
        }
    }

    emit('blur', event)
}

watch(model, (value) => {
    const inputValue = String(value ?? '')

    if (!hasNumberConstraints.value || getNumberInputError(inputValue) === null) {
        lastValidInputValue = inputValue
    }

    displayValue.value = inputValue
})

onMounted(() => {
    inputRef.value?.addEventListener('ad2m:focus-origin', onFocusOrigin)
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
})

onBeforeUnmount(() => {
    inputRef.value?.removeEventListener('ad2m:focus-origin', onFocusOrigin)
    document.removeEventListener('keydown', onKeyDown)
    document.removeEventListener('pointerdown', onPointerDown)
})

defineExpose({
    focusInput
})
</script>

<style lang="scss" scoped>
.az-input {
    min-width: 0;
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 8px;

    &__label {
        padding-inline: 4px;
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        gap: 4px;
        font-size: 15px;
        line-height: 1em;
        color: $color-milk-400;
    }

    &__field {
        width: 100%;
        min-width: 0;
        min-height: 76px;
        padding: 12px 24px;
        display: flex;
        align-items: center;
        gap: 12px;
        background: $color-milk-100;
        border-radius: 38px;
        border: 4px solid var(--input-border-color, #{$color-milk-100});
        transition: border-color .25s;

        @media (max-width: 360px) {
            padding-inline: 12px;
        }

        &--with-slot {
            padding-inline-end: 12px;
        }

        &--keyboard-focus {
            border-color: var(--input-focus-color, #{$color-grey-400});
        }

        &--error,
        &--error:focus-within {
            border-color: var(--input-error-color, #{$color-rose-200});
        }
    }

    &__value {
        width: 100%;
        min-width: 0;
        height: 44px;
        display: block;
        flex: 1;
        outline: none;
        font-size: 20px;
        line-height: 1em;
        color: $color-milk-500;
    }

    &__append {
        display: flex;
        flex-shrink: 0;
        align-items: center;
    }

    &__error {
        margin-block-start: -.25em;
        padding-inline: 4px;
        font-size: 15px;
        line-height: 1.5em;
        color: $color-milk-500;
    }

    &__error-prefix {
        font-weight: 500;
        color: var(--input-error-color, #{$color-rose-200});
    }
}
</style>