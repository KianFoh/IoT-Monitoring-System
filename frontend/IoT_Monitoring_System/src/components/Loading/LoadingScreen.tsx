import styles from "./LoadingScreen.module.css";

export const LoadingScreen = () => {
  return (
    <div className={styles["gen-loadingScreen"]}>
      <div className={styles["gen-loadingCard"]}>
        <div className={styles["gen-loadingSpinner"]} aria-hidden="true" />
        <div className={styles["gen-loadingText"]}>Loading, please wait...</div>
      </div>
    </div>
  );
};
