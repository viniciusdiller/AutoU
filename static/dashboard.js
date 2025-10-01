document.addEventListener("DOMContentLoaded", () => {
  fetchDashboardData();
});

async function fetchDashboardData() {
  try {
    const response = await fetch("/dashboard/data");
    if (!response.ok) {
      throw new Error("Não foi possível carregar os dados do dashboard.");
    }
    // A resposta agora é um objeto complexo
    const data = await response.json();
    processAndRenderCharts(data);
  } catch (error) {
    console.error("Erro ao buscar dados do dashboard:", error);
  }
}

function processAndRenderCharts(data) {
  // O array de dados brutos está agora dentro de 'all_data'
  const allData = data.all_data;

  if (!allData || allData.length === 0) {
    console.log("Nenhum dado de histórico para exibir.");
    // Opcional: Ocultar ou mostrar uma mensagem nos contêineres dos gráficos
    return;
  }

  // --- Gráfico de Pizza de Classificação (processamento como antes) ---
  const classificationCounts = allData.reduce((acc, item) => {
    const classification = item.classification || "Desconhecido";
    acc[classification] = (acc[classification] || 0) + 1;
    return acc;
  }, {});
  renderClassificationChart(classificationCounts);

  // --- Lista de Tópicos (processamento como antes) ---
  const keyTopicCounts = allData.reduce((acc, item) => {
    const topic = item.key_topic || "N/A";
    if (topic !== "N/A") {
      acc[topic] = (acc[topic] || 0) + 1;
    }
    return acc;
  }, {});
  const sortedTopics = Object.entries(keyTopicCounts).sort(
    ([, a], [, b]) => b - a
  );
  renderTopicsList(sortedTopics);

  // --- NOVO: Renderizar Gráficos de Linha com os dados já processados do backend ---
  renderSentimentOverTimeChart(data.sentiments_over_time);
  renderClassificationOverTimeChart(data.classifications_over_time);
}

// --- Funções de Renderização (uma para cada gráfico) ---

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
          backgroundColor: ["#10b981", "#6b7280", "#ef4444", "#f59e0b"],
          hoverOffset: 4,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "top" },
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
      ([topic, count]) =>
        `<li><span class="topic-name">${topic}</span><span class="topic-count">${count}</span></li>`
    )
    .join("");
}

// --- NOVAS FUNÇÕES DE RENDERIZAÇÃO ---

function renderSentimentOverTimeChart(data) {
  const ctx = document
    .getElementById("sentimentOverTimeChart")
    .getContext("2d");

  const labels = Object.keys(data).sort(); // Datas ordenadas

  const positiveData = labels.map((date) => data[date]["Positivo"] || 0);
  const negativeData = labels.map((date) => data[date]["Negativo"] || 0);
  const neutralData = labels.map((date) => data[date]["Neutro"] || 0);

  new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Positivo",
          data: positiveData,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          fill: true,
          tension: 0.3,
        },
        {
          label: "Negativo",
          data: negativeData,
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          fill: true,
          tension: 0.3,
        },
        {
          label: "Neutro",
          data: neutralData,
          borderColor: "#6b7280",
          backgroundColor: "rgba(107, 114, 128, 0.1)",
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: {
          type: "time",
          time: {
            unit: "day",
            tooltipFormat: "dd/MM/yyyy",
          },
          title: { display: true, text: "Data" },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: "Número de E-mails" },
        },
      },
    },
  });
}

function renderClassificationOverTimeChart(data) {
  const ctx = document
    .getElementById("classificationOverTimeChart")
    .getContext("2d");

  const labels = Object.keys(data).sort();

  const productiveData = labels.map((date) => data[date]["Produtivo"] || 0);
  const unproductiveData = labels.map((date) => data[date]["Improdutivo"] || 0);

  new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Produtivo",
          data: productiveData,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          fill: true,
          tension: 0.3,
        },
        {
          label: "Improdutivo",
          data: unproductiveData,
          borderColor: "#f97316",
          backgroundColor: "rgba(249, 115, 22, 0.1)",
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        x: {
          type: "time",
          time: {
            unit: "day",
            tooltipFormat: "dd/MM/yyyy",
          },
          title: { display: true, text: "Data" },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: "Número de E-mails" },
        },
      },
    },
  });
}
