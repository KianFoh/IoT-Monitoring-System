import DropdownSelect from "./DropdownSelect";
import styles from "../styles/dashboard.module.css";
import GridLayout, { Responsive } from "react-grid-layout";
import WidthProvider from "react-grid-layout"; 

type DisplayOption<T extends string> = {
  value: T;
  label: string;
};

type DeviceDataChartProps<T extends string> = {
  displayMode: T;
  options: DisplayOption<T>[];
  onDisplayChange: (value: T) => void;
  disabled?: boolean;
};

export function DeviceDataChart<T extends string>({
  displayMode,
  options,
  onDisplayChange,
  disabled,
}: DeviceDataChartProps<T>) {
  return (
    <div className={styles["device-data-panel"]}>
      <div className={styles["device-data-panel-header"]}>
        <div>
          <h2>Data Chart</h2>
          <span className={styles["device-data-panel-subtitle"]}>Device Data chart view.</span>
        </div>
        <div className={styles["device-data-panel-controls"]}>
          <DropdownSelect
            id="device-dashboard-display"
            value={displayMode}
            options={options}
            onChange={onDisplayChange}
            disabled={disabled}
          />
        </div>
      </div>
      <div className={styles["device-data-empty"]}>
        <p>Charts will appear here once available.</p>
      </div>
    </div>
  );
}
