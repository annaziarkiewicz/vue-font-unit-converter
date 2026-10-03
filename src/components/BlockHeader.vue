<template>
    <header class="az-header">
        <h1>{{ appHeadline }}</h1>
    </header>
</template>

<script lang="ts" setup>
defineProps<{
    appHeadline: string
}>()
</script>

<style lang="scss" scoped>
.az-header {
    height: 36px;
    padding: 0 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #CFCFC9;
    font-size: 15px;
    color: $color-grey-400;
}
</style>