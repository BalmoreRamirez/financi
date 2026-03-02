<script setup lang="ts">
import { computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

type TableRow = Record<string, any>

const props = withDefaults(defineProps<{
    data: TableRow[]
    footerData?: TableRow | null
    emptyText?: string
}>(), {
    footerData: null,
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
        <DataTable
            :value="data"
            responsiveLayout="scroll"
            tableStyle="min-width: 720px"
            class="app-data-table text-sm"
        >
            <template #empty>
                <div class="px-4 py-6 text-center text-sm text-gray-400">
                    {{ emptyText }}
                </div>
            </template>

            <Column
                v-for="column in columns"
                :key="column"
                :field="column"
                :header="column"
                headerClass="text-sm font-medium text-left"
                bodyClass="text-ink text-left"
            >
                <template #body="slotProps">
                    <div :class="['w-full text-left', cellContentClass(slotProps.data[column])]">
                        <template v-if="isCellObject(slotProps.data[column]) && slotProps.data[column].type === 'badge'">
                            <span :class="['inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold', slotProps.data[column].class]">
                                {{ cellText(slotProps.data[column]) }}
                            </span>
                        </template>

                        <template v-else-if="isCellObject(slotProps.data[column]) && slotProps.data[column].type === 'actions'">
                            <div class="flex items-center justify-center gap-2">
                                <button
                                    v-for="action in slotProps.data[column].actions"
                                    :key="action.key"
                                    :disabled="action.disabled"
                                    :title="action.title"
                                    :class="[
                                        'p-2 rounded-lg transition',
                                        action.disabled ? (action.disabledClass ?? 'text-gray-300 cursor-not-allowed') : action.class
                                    ]"
                                    @click="emitAction(action.key, slotProps.data)"
                                >
                                    <i :class="['pi', action.icon]" />
                                </button>
                            </div>
                        </template>

                        <template v-else>
                            {{ cellText(slotProps.data[column]) }}
                        </template>
                    </div>
                </template>

                <template #footer>
                    <div
                        v-if="footerData && footerData[column]"
                        :class="[
                            'w-full',
                            cellAlignClass(footerData[column]),
                            cellContentClass(footerData[column]),
                            'text-sm font-semibold !text-left'
                        ]"
                    >
                        <template v-if="isCellObject(footerData[column]) && footerData[column].type === 'badge'">
                            <span :class="['inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold', footerData[column].class]">
                                {{ cellText(footerData[column]) }}
                            </span>
                        </template>
                        <template v-else>
                            {{ cellText(footerData[column]) }}
                        </template>
                    </div>
                </template>
            </Column>
        </DataTable>
    </div>
</template>

<style scoped>
:deep(.app-data-table .p-datatable-table) {
    width: 100%;
}

:deep(.app-data-table .p-datatable-thead > tr > th) {
    background: rgb(11 49 69);
    color: white;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    border-width: 0;
}

:deep(.app-data-table .p-datatable-tbody > tr > td) {
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    border-top: 1px solid rgb(243 244 246);
}

:deep(.app-data-table .p-datatable-tbody > tr:hover) {
    background: rgb(244 246 248);
}

:deep(.app-data-table .p-datatable-tfoot > tr > td),
:deep(.app-data-table .p-datatable-tfoot > tr > th) {
    padding: 0.75rem 1rem;
    background: rgb(244 246 248);
    border-top: 1px solid rgb(229 231 235);
}
</style>