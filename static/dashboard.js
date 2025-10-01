document.addEventListener("DOMContentLoaded", () => {
  fetchDashboardData();
});

async function fetchDashboardData() {
  try {
    const response = await fetch("/dashboard/data");
    if (!response.ok) {
      throw new Error("Não foi possível carregar os dados do dashboard.");
    }
    const data = await response.json();
    processAndRenderCharts(data);
  } catch (error) {
    console.error("Erro ao buscar dados do dashboard:", error);
  }
}

function processAndRenderCharts(data) {
  if (!data || data.length === 0) {
    console.log("Nenhum dado de histórico para exibir.");
    return;
  }

  // --- Processamento para o Gráfico de Pizza ---
  const classificationCounts = data.reduce((acc, item) => {
    const classification = item.classification || "Desconhecido";
    acc[classification] = (acc[classification] || 0) + 1;
    return acc;
  }, {});

  renderClassificationChart(classificationCounts);

  // --- Processamento para a Lista de Tópicos ---
  const keyTopicCounts = data.reduce((acc, item) => {
    const topic = item.key_topic || "N/A";
    if (topic !== "N/A") {
      acc[topic] = (acc[topic] || 0) + 1;
    }
    return acc;
  }, {});

  // Ordena os tópicos por contagem (do maior para o menor)
  const sortedTopics = Object.entries(keyTopicCounts).sort(
    ([, a], [, b]) => b - a
  );

  renderTopicsList(sortedTopics);
}

function renderClassificationChart(counts) {
  const ctx = document.getElementById("classificationChart").getContext("2d");
  new Chart(ctx, {
    type: "pie",
    data: {
      labels: Object.keys(counts),
      datasets: [
        {
          label: "Classificações",
          data: Object.values(counts),
          backgroundColor: ["#10b981", "#6b7280", "#ef4444"], // Cores para Produtivo, Improdutivo, etc.
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "top",
        },
        title: {
          display: false,
          text: "Distribuição de Classificações",
        },
      },
    },
  });
}

function renderTopicsList(sortedTopics) {
  const listElement = document.getElementById("topics-list");
  if (sortedTopics.length === 0) {
    listElement.innerHTML = "<li>Nenhum tópico chave identificado ainda.</li>";
    return;
  }

  listElement.innerHTML = sortedTopics
    .map(
      ([topic, count]) => `
    <li>
      <span class="topic-name">${topic}</span>
      <span class="topic-count">${count}</span>
    </li>
  `
    )
    .join("");
}
