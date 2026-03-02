<script setup lang="ts">
import { computed } from 'vue'

type TableRow = Record<string, any>

const props = withDefaults(defineProps<{
    data: TableRow[]
    emptyText?: string
}>(), {
    emptyText: 'Sin datos disponibles'
})

const emit = defineEmits<{
    (e: 'action', payload: { action: string; row: TableRow }): void
}>()

const columns = computed(() => {
    const firstRow = props.data[0] ?? {}
    return Object.keys(firstRow).filter((key) => !key.startsWith('__'))
})

const isCellObject = (cell: any) => {
    return typeof cell === 'object' && cell !== null && !Array.isArray(cell)
}

const cellText = (cell: any) => {
    if (isCellObject(cell)) {
        if (cell.type === 'badge') return cell.label ?? ''
        return cell.text ?? ''
    }
    return cell ?? ''
}

const cellAlignClass = (cell: any) => {
    if (!isCellObject(cell) || !cell.align) return ''
    if (cell.align === 'right') return 'text-right'
    if (cell.align === 'center') return 'text-center'
    return 'text-left'
}

const cellContentClass = (cell: any) => {
    if (!isCellObject(cell)) return ''
    if (cell.type === 'badge' || cell.type === 'actions') return ''
    return cell.class ?? ''
}

const emitAction = (action: string, row: TableRow) => {
    emit('action', { action, row })
}
</script>

<template>
    <div class="overflow-x-auto">
        <table class="w-full min-w-[720px]">
            <thead class="bg-ink text-white">
                <tr>
                    <th
                        v-for="column in columns"
                        :key="column"
                        class="px-4 py-3 text-left text-sm font-medium"
                    >
                        {{ column }}
                    </th>
                </tr>
            </thead>
            <tbody v-if="data.length" class="divide-y divide-gray-100">
                <tr v-for="(row, index) in data" :key="index" class="hover:bg-cloud">
                    <td
                        v-for="column in columns"
                        :key="column"
                        :class="['px-4 py-3 text-sm text-ink', cellAlignClass(row[column]), cellContentClass(row[column])]"
                    >
                        <template v-if="isCellObject(row[column]) && row[column].type === 'badge'">
                            <span :class="['inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold', row[column].class]">
                                {{ cellText(row[column]) }}
                            </span>
                        </template>

                        <template v-else-if="isCellObject(row[column]) && row[column].type === 'actions'">
                            <div class="flex items-center justify-center gap-2">
                                <button
                                    v-for="action in row[column].actions"
                                    :key="action.key"
                                    :disabled="action.disabled"
                                    :title="action.title"
                                    :class="[
                                        'p-2 rounded-lg transition',
                                        action.disabled ? (action.disabledClass ?? 'text-gray-300 cursor-not-allowed') : action.class
                                    ]"
                                    @click="emitAction(action.key, row)"
                                >
                                    <i :class="['pi', action.icon]" />
                                </button>
                            </div>
                        </template>

                        <template v-else>
                            {{ cellText(row[column]) }}
                        </template>
                    </td>
                </tr>
            </tbody>
            <tbody v-else>
                <tr>
                    <td :colspan="columns.length || 1" class="px-4 py-6 text-center text-sm text-gray-400">
                        {{ emptyText }}
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>