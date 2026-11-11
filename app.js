const sceneTitle = document.querySelector('#sceneTitle');
const sceneBreadcrumb = document.querySelector('#sceneBreadcrumb');
const officeMode = document.querySelector('#officeMode');

document.body.classList.add('office-on');

document.querySelectorAll('.scene-item').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.scene-item').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    const scene = button.dataset.scene;
    sceneTitle.textContent = `${scene} 대사 편집`;
    sceneBreadcrumb.textContent = scene;
  });
});

document.querySelectorAll('.module-button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.module-button').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
  });
});

document.querySelectorAll('.phase-tab').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.phase-tab').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
  });
});

document.querySelectorAll('.detail-tab').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.detail-tab').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
  });
});

officeMode.addEventListener('change', () => {
  document.body.classList.toggle('office-on', officeMode.checked);
});
