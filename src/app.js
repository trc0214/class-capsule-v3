(function () {
  window.addEventListener("DOMContentLoaded", () => {
    const app = window.AppController.createController();
    app.init().catch((error) => {
      console.error(error);
      alert(error.message);
    });
  });
})();