<template>
    <section
        class="az-app"
        :class="{ 'az-app--inside-iframe': isIframe }"
        :aria-label="appHeadline"
    >
        <BlockHeader
            :app-headline="appHeadline"
        />

        <BlockConverter />
    </section>

    <BlockSplinter :is-iframe="isIframe" />
</template>

<script lang="ts" setup>
import { useIframeCommunication } from '@/composables/useIframeCommunication'

import BlockConverter from '@/components/BlockConverter.vue'
import BlockHeader from '@/components/BlockHeader.vue'
import BlockSplinter from '@/components/BlockSplinter.vue'

const appHeadline = 'Font Unit Converter'
const { isIframe } = useIframeCommunication()
</script>

<style lang="scss" scoped>
.az-app {
    width: 100%;
    max-width: 400px;
    min-height: 680px;
    padding-block-end: 36px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: $color-milk-200;

    @media (max-width: 360px) {
        padding-block-end: 24px;
    }

    &:not(.az-app--inside-iframe) {
        margin-block-start: 24px;
    }
}
</style>