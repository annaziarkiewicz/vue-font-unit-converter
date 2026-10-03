<template>
    <div class="az-converter">
        <div
            v-for="(row, index) in rows"
            :key="index"
            class="az-converter__row"
        >
            <div
                v-for="field in row"
                :key="field.key"
                class="az-converter__input"
                :class="`az-converter__input--${uiState(field.key)}`"
            >
                <BlockInput
                    :key="`${inputResetKey}-${inputRefreshKeys[field.key] ?? 0}`"
                    :aria-describedby="`${inputId}-${field.key}-status`"
                    :aria-invalid="field.key === 'base' && !isBaseValid ? 'true' : undefined"
                    :aria-labelledby="`${inputId}-${field.key}-label`"
                    border-color="var(--converter-input-border-color)"
                    :error="inputErrors[field.key]"
                    error-color="#FFBB00"
                    focus-color="var(--converter-input-border-color)"
                    :id="`${inputId}-${field.key}`"
                    :max="inputSettings[field.key].max"
                    :max-decimal-places="inputSettings[field.key].decimalPlaces"
                    :min="inputSettings[field.key].min"
                    :model-value="values[field.key]"
                    :restore-invalid-value="false"
                    :step="inputSettings[field.key].step"
                    type="number"
                    @blur="onBlur"
                    @focus="onFocus(field.key)"
                    @invalid="onInvalidInput($event, field.key)"
                    @update:model-value="updateValue($event, field.key)"
                    @valid="onValidInput(field.key)"
                >
                    <template #label>
                        <span :id="`${inputId}-${field.key}-label`">
                            {{ field.label }}
                        </span>
                        <span
                            :id="`${inputId}-${field.key}-status`"
                            class="az-converter__status"
                            :class="inputErrors[field.key]
                                ? 'az-converter__status--error'
                                : `az-converter__status--${uiState(field.key)}`"
                            aria-live="polite"
                        >
                            {{ uiText(field.key) }}
                        </span>
                    </template>
                </BlockInput>
            </div>
        </div>

        <button
            class="az-converter__reset"
            type="button"
            @click="onReset"
        >
            Reset
        </button>

        <div
            class="az-converter__announcement"
            aria-live="polite"
            aria-atomic="true"
        >
            {{ announcement }}
        </div>
    </div>
</template>

<script lang="ts" setup>
import {
    ref,
    useId
} from 'vue'

import { useFontUnitConverter } from '@/composables/useFontUnitConverter'

import BlockInput from '@/components/BlockInput.vue'

import type { InputKey } from '@/types/fontUnitConverter'

const {
    announcement,
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
} = useFontUnitConverter()

const inputId = useId()
const inputErrors = ref<Partial<Record<InputKey, string>>>({})
const inputRefreshKeys = ref<Partial<Record<InputKey, number>>>({})
const inputResetKey = ref(0)

const rows: { key: InputKey, label: string }[][] = [
    [{ key: 'base', label: 'Base font size (px)' }],
    [{ key: 'px', label: 'PX' }],
    [{ key: 'em', label: 'EM' }, { key: 'rem', label: 'REM' }],
    [{ key: 'percent', label: '%' }, { key: 'vw', label: 'VW' }]
]

const onInvalidInput = (
    reason: Parameters<typeof getErrorMessage>[0],
    key: InputKey
) => {
    inputErrors.value[key] = getErrorMessage(reason, key)
    setConversionPaused(true)
}

const onValidInput = (key: InputKey) => {
    const wasPaused = Object.keys(inputErrors.value).length > 0

    delete inputErrors.value[key]
    const paused = Object.entries(inputErrors.value).some(([fieldKey, message]) => {
        return fieldKey === 'base'
            || fieldKey === lastInputKey.value
            || message !== getErrorMessage('empty', fieldKey as InputKey)
    })

    setConversionPaused(paused)

    if (wasPaused && !paused) {
        onInput(key)
    }

    if (!paused && isBaseValid.value) {
        for (const fieldKey of Object.keys(inputErrors.value) as InputKey[]) {
            if (inputErrors.value[fieldKey] === getErrorMessage('empty', fieldKey)
                && values.value[fieldKey] !== ''
                && Number.isFinite(values.value[fieldKey])) {
                delete inputErrors.value[fieldKey]
                inputRefreshKeys.value[fieldKey] = (inputRefreshKeys.value[fieldKey] ?? 0) + 1
            }
        }
    }
}

const onReset = () => {
    inputErrors.value = {}
    inputRefreshKeys.value = {}
    resetValues()
    inputResetKey.value += 1
}

const updateValue = (value: number | string, key: InputKey) => {
    values.value[key] = value === '' ? '' : Number(value)
    onInput(key)
}

</script>

<style lang="scss" scoped>
.az-converter {
    padding-inline: 36px;
    display: flex;
    flex-direction: column;
    gap: 36px;

    @media (max-width: 360px) {
        padding-inline: 24px;
    }

    &__row {
        display: flex;
        gap: 24px;

        @media (max-width: 360px) {
            flex-direction: column;
            gap: 12px;
        }
    }

    &__input {
        --converter-input-border-color: #{$color-milk-100};
        min-width: 0;
        display: flex;
        flex: 1;

        @media (max-width: 360px) {
            width: 100%;
        }

        &--base {
            --converter-input-border-color: #{$color-rose-200};
        }

        &--constant {
            --converter-input-border-color: #{$color-navy-200};
        }

        &--typing {
            --converter-input-border-color: #{$color-mint-300};
        }
    }

    &__status {
        padding: 0 4px;
        font-size: 13px;

        &--base {
            color: $color-rose-200;
        }

        &--constant {
            color: $color-navy-200;
        }

        &--typing {
            color: $color-mint-400;
        }

        &--output {
            color: $color-grey-200;
        }

        &--error {
            color: #FFBB00;
        }
    }

    &__announcement {
        position: absolute;
        overflow: hidden;
        width: 1px;
        height: 1px;
        padding: 0;
        border: 0;
        white-space: nowrap;
        clip-path: inset(50%);
    }

    &__reset {
        padding: 20px 28px;
        background: $color-rose-200;
        border-radius: 12px;
        font-size: 18px;
        font-weight: 500;
        line-height: 1em;
        color: $color-milk-100;
        text-transform: uppercase;

        &:hover {
            background: $color-rose-300;
        }

        &:focus-visible {
            @include focus-ring($color-grey-400, 12px);
        }
    }
}
</style>