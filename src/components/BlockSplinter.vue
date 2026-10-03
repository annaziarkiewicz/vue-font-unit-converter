<template>
    <section v-if="!isIframe || $slots.credits" class="az-splinter">
        <div v-if="!isIframe" class="az-splinter__author">
            Made with Vue.js by
            <a
                class="az-splinter__link"
                href="https://aniudomniemow.net"
                target="_blank"
            >
                Anna Ziarkiewicz
            </a>
        </div>

        <slot name="credits" />
    </section>
</template>

<script lang="ts" setup>
defineProps<{
    isIframe: boolean
}>()
</script>

<style lang="scss" scoped>
.az-splinter {
    width: 100%;
    max-width: 960px;
    padding: 24px 36px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    font-size: 15px;
    line-height: 1.25em;
    color: $color-milk-200;
    text-align: center;

    @media (max-width: 767px) {
        padding-inline: 24px;
    }

    &__link {
        color: $color-milk-100;
        transition: .25s;

        &:hover {
            color: $color-grey-400;
            text-shadow: 1px 1px $color-grey-200;
        }

        &:focus-visible {
            @include focus-ring($color-grey-400, 4px);
        }
    }
}
</style>