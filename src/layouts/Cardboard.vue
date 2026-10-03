<template>
    <div class="az-layout">
        <slot />
    </div>
</template>

<style lang="scss" scoped>
.az-layout {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
}
</style>