import "./LoadingScreen.css";

export const LoadingScreen = () => {
  return (
    <div className="loadingScreen">
      <div className="loadingCard">
        <div className="loadingSpinner" aria-hidden="true" />
        <div className="loadingText">Loading, please wait...</div>
      </div>
    </div>
  );
};
