// クエリからID取得
const urlParams = new URLSearchParams(window.location.search);
const moleculeId = urlParams.get("id");

fetch("/data/molecules.json")
  .then(res => res.json())
  .then(molecules => {
    const mol = molecules.find(m => m.id === moleculeId);
    if (!mol) return alert("分子が見つかりません");

    document.getElementById("mol-name").textContent = mol.name;
    document.getElementById("mol-desc").textContent = mol.description;

    // 3Dmolで表示
    console.log("ファイル読み込み開始:", mol.file, mol.type);
    fetch(mol.file)
      .then(res => {
        if (!res.ok) {
          throw new Error(`ファイルが読み込めませんでした: ${mol.file} (${res.status})`);
        }
        return res.text();
      })
      .then(cifData => {
        console.log("cifファイル内容:", cifData.slice(0, 100)); // デバッグ
        const viewer = $3Dmol.createViewer("viewer", { backgroundColor: "white" });
        viewer.addModel(cifData, mol.type); // ← ここで失敗することがある
        viewer.setStyle({}, { stick: {} });
        viewer.zoomTo();
        viewer.render();
      })
      .catch(err => {
        console.error("表示エラー:", err);
        alert("分子ファイルの読み込みに失敗しました");
      });
  });