import type {
  DashboardChartConfig,
  DashboardConfig,
  DashboardPanelConfig,
  DeviceDashboardConfig,
  LegacyDashboardConfig,
} from "@/types/device";

export type NormalizedDashboardConfig = {
  data_panel: Required<DashboardPanelConfig>;
  data_chart: Required<DashboardChartConfig>;
};

const createEmptyPanel = (): Required<DashboardPanelConfig> => ({
  fields: [],
  config: {},
  layout: [],
  sections: [],
});

const createEmptyChart = (): Required<DashboardChartConfig> => ({
  items: [],
  layout: [],
  sections: [],
});

const normalizePanel = (panel?: DashboardPanelConfig): Required<DashboardPanelConfig> => ({
  fields: (panel?.fields ?? []).filter((field): field is string => Boolean(field)),
  config: panel?.config ?? {},
  layout: panel?.layout ?? [],
  sections: (panel?.sections ?? []).filter((section) => Boolean(section?.id)),
});

const normalizeChart = (chart?: DashboardChartConfig): Required<DashboardChartConfig> => ({
  items: (chart?.items ?? []).filter(Boolean),
  layout: chart?.layout ?? [],
  sections: (chart?.sections ?? []).filter((section) => Boolean(section?.id)),
});

export const isLegacyDashboardConfig = (
  config: DeviceDashboardConfig | null | undefined
): config is LegacyDashboardConfig => {
  if (!config) return false;
  return (
    "data_panel_fields" in config ||
    "data_panel_config" in config ||
    "data_chart_items" in config ||
    "data_chart_layout" in config
  );
};

export const normalizeDashboardConfig = (
  config?: DeviceDashboardConfig | null
): NormalizedDashboardConfig => {
  if (!config) {
    return {
      data_panel: createEmptyPanel(),
      data_chart: createEmptyChart(),
    };
  }

  if (isLegacyDashboardConfig(config)) {
    return {
      data_panel: normalizePanel({
        fields: config.data_panel_fields ?? [],
        config: config.data_panel_config ?? {},
        layout: config.data_panel_layout ?? [],
        sections: config.data_panel_sections ?? [],
      }),
      data_chart: normalizeChart({
        items: config.data_chart_items ?? [],
        layout: config.data_chart_layout ?? [],
        sections: config.data_chart_sections ?? [],
      }),
    };
  }

  return {
    data_panel: normalizePanel(config.data_panel),
    data_chart: normalizeChart(config.data_chart),
  };
};

export const buildDashboardConfig = (
  normalized: NormalizedDashboardConfig
): DashboardConfig => ({
  data_panel: {
    fields: normalized.data_panel.fields,
    config: normalized.data_panel.config,
    layout: normalized.data_panel.layout,
    sections: normalized.data_panel.sections,
  },
  data_chart: {
    items: normalized.data_chart.items,
    layout: normalized.data_chart.layout,
    sections: normalized.data_chart.sections,
  },
});
