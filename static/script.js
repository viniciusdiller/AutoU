document.addEventListener("DOMContentLoaded", () => {
  // Tornando as variáveis de elementos DOM acessíveis em todo o escopo
  const form = document.getElementById("email-form");
  const fileUploadArea = document.querySelector(".file-upload-area");
  const fileInput = document.getElementById("file-upload");
  const emailTextInput = document.getElementById("email-text");

  // Acesso seguro ao HTML original
  const fileUploadP = fileUploadArea.querySelector("p");
  const originalFileUploadHTML = fileUploadP.innerHTML;

  // Variável para armazenar o nome do primeiro arquivo para exibir (necessário para a função global updateFileName)
  let firstFileName = "";

  // Carrega o histórico
  loadHistory();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    // A função handleFormSubmit agora pode acessar fileInput e emailTextInput
    handleFormSubmit();
  });

  // NOVO: Limpa a seleção de arquivo quando o usuário digita no textarea
  emailTextInput.addEventListener("input", () => {
    if (emailTextInput.value.trim() !== "") {
      restoreFileUploadArea();
    }
  });

  // Lógica para arrastar arquivo
  fileUploadArea.addEventListener("dragover", (event) => {
    event.preventDefault();
    fileUploadArea.classList.add("dragover");
  });
  fileUploadArea.addEventListener("dragleave", () => {
    fileUploadArea.classList.remove("dragover");
  });
  fileUploadArea.addEventListener("drop", (event) => {
    event.preventDefault();
    fileUploadArea.classList.remove("dragover");
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      fileInput.files = files;
      firstFileName = files[0].name; // Armazena o nome
      updateFileName(files.length); // Passa a contagem
      emailTextInput.value = "";
    }
  });

  // Lógica deselecionar arquivo
  fileInput.addEventListener("change", () => {
    if (fileInput.files && fileInput.files.length > 0) {
      firstFileName = fileInput.files[0].name; // Armazena o nome
      updateFileName(fileInput.files.length); // Passa a contagem
      emailTextInput.value = "";
    } else {
      // Se o usuário cancelou a seleção, restaura
      restoreFileUploadArea();
    }
  });

  fileUploadArea.addEventListener("click", (event) => {
    if (event.target.closest("#remove-file-btn")) {
      event.preventDefault();
      event.stopPropagation();
      restoreFileUploadArea();
    }
  });

  // Função para limpar o input e restaurar a área de upload
  function restoreFileUploadArea() {
    fileInput.value = "";
    firstFileName = "";
    fileUploadP.innerHTML = originalFileUploadHTML;
    fileUploadArea.classList.remove("file-selected");
  }

  // Função para mostrar o nome/contagem do arquivo e o botão de remover
  function updateFileName(count) {
    if (count === 0) {
      restoreFileUploadArea();
      return;
    }

    fileUploadArea.classList.add("file-selected");

    const nameDisplay =
      count === 1 ? firstFileName : `${count} arquivos selecionados`;

    fileUploadP.innerHTML = `
            <div class="file-selected-container">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                <span class="file-name">${nameDisplay}</span>
                <button type="button" id="remove-file-btn" title="Remover arquivo">&times;</button>
            </div>
        `;
  }

  const historyContainer = document.getElementById("history");
  if (historyContainer) {
    historyContainer.addEventListener("click", (event) => {
      const header = event.target.closest(".history-header");
      if (header) {
        const item = header.closest(".history-item");
        item.classList.toggle("expanded");
      }
    });
  }
});

// Funções de formulário e resultados

async function handleFormSubmit() {
  const emailText = document.getElementById("email-text").value;
  const fileInput = document.getElementById("file-upload");
  const files = fileInput.files;

  const resultsArea = document.getElementById("results-area");
  const loadingIndicator = document.getElementById("loading-indicator");
  const formData = new FormData();

  if (emailText) {
    formData.append("email_text", emailText);
  } else if (files && files.length > 0) {
    // CORREÇÃO: Itera sobre a lista de arquivos e usa a chave 'files[]'
    for (let i = 0; i < files.length; i++) {
      formData.append("files[]", files[i]);
    }
  } else {
    displayError("Por favor, insira um texto ou faça o upload de um arquivo.");
    return;
  }

  resultsArea.classList.add("hidden");
  resultsArea.innerHTML = "";
  clearError();
  loadingIndicator.classList.remove("hidden");

  try {
    const response = await fetch("/classify", {
      method: "POST",
      body: formData,
    });
    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.error || "Ocorreu um erro no servidor.");
    }
    displayResults(responseData);
    loadHistory();
  } catch (error) {
    console.error("Erro:", error);
    displayError(error.message);
  } finally {
    loadingIndicator.classList.add("hidden");
  }
}

function displayResults(data) {
  const resultsArea = document.getElementById("results-area");
  resultsArea.innerHTML = "";
  clearError();

  const resultsList = Array.isArray(data) ? data : [data];

  if (resultsList.length === 0) {
    displayError("A IA não retornou resultados válidos.");
    return;
  }

  // Cria um container para os múltiplos resultados
  let allResultsHTML = `<h2>Resultados da Análise</h2>`;

  resultsList.forEach((result, index) => {
    // Se o resultado for um erro de processamento
    if (result.error) {
      allResultsHTML += `<div id="error-message" style="margin-bottom: 1.5rem; text-align: left;"><strong>Erro de Processamento:</strong> ${result.error}</div>`;
      return;
    }

    // Validação básica
    if (!result || !result.classification) {
      allResultsHTML += `<div id="error-message" style="margin-bottom: 1.5rem; text-align: left;">A IA retornou uma resposta em um formato inesperado para o item ${
        index + 1
      }.</div>`;
      return;
    }

    const translationMap = {
      classification: "Classificação",
      confidence_score: "Nível de Confiança",
      key_topic: "Tópico Chave",
      sentiment: "Sentimento",
    };

    const suggestedResponse =
      result.suggested_response || "Nenhuma resposta necessária.";

    const sourceFilename = result.source_filename || "Texto Colado";
    const uniqueId = `copy-btn-${index}`;

    let resultsGridHTML = "";

    // Lista de chaves que devem ser exibidas e na ordem
    const keysToShow = [
      "classification",
      "confidence_score",
      "key_topic",
      "sentiment",
    ];

    // Estrutura para exibir um resultado individual
    allResultsHTML += `<div class="analysis-result-card">
        <h3 class="analysis-result-title">Item Analisado: ${sourceFilename}</h3>

        <div class="result-item" style="grid-column: 1 / -1; margin-bottom: 1rem;">
            <strong>Fonte:</strong>
            <span>${sourceFilename}</span>
        </div>

        <div class="results-grid">`; // Abre o results-grid

    // Processa os resultados principais na ordem desejada
    for (const key of keysToShow) {
      // Tenta obter o valor do resultado, caindo para 'N/A' se não existir
      let displayValue = result[key] || "N/A";

      // Verifica se o valor é 0.0, o que pode ocorrer se o Gemini não retornar, e padroniza para N/A
      if (
        typeof displayValue === "number" &&
        displayValue === 0.0 &&
        key !== "confidence_score"
      ) {
        displayValue = "N/A";
      }

      const label =
        translationMap[key] || key.charAt(0).toUpperCase() + key.slice(1);

      if (key === "confidence_score") {
        displayValue = `${(result[key] * 100).toFixed(0)}%`;
      }

      // CORRIGIDO: Adiciona Tópico Chave e Sentimento ao grid
      allResultsHTML += `<div class="result-item"><strong>${label}</strong><span>${displayValue}</span></div>`;
    }

    allResultsHTML += `</div>`; // Fecha o results-grid

    // Restante da Resposta Sugerida
    allResultsHTML += `
    <div class="result-item-response">
        <div class="response-header">
            <strong>Resposta Sugerida:</strong>
            <button id="${uniqueId}" class="copy-btn" data-response="${suggestedResponse.replace(
      /"/g,
      "&quot;"
    )}" title="Copiar resposta">Copiar</button>
        </div>
        <p id="suggested-text" style="white-space: pre-wrap;">${suggestedResponse.replace(
          /\n/g,
          "<br>"
        )}</p>
    </div>
</div>`;
  });

  resultsArea.innerHTML = allResultsHTML;
  resultsArea.classList.remove("hidden");

  // Adiciona listeners para os novos botões de cópia dinamicamente
  document.querySelectorAll(".copy-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const responseText = button.getAttribute("data-response");
      navigator.clipboard
        .writeText(responseText)
        .then(() => {
          button.textContent = "Copiado!";
          setTimeout(() => {
            button.textContent = "Copiar";
          }, 2000);
        })
        .catch((err) => console.error("Erro ao copiar texto: ", err));
    });
  });
}

function displayError(message) {
  const errorContainer = document.getElementById("error-message-container");
  errorContainer.innerHTML = `<div id="error-message">${message}</div>`;
}

function clearError() {
  const errorContainer = document.getElementById("error-message-container");
  errorContainer.innerHTML = "";
}

// FUNÇÕES PARA O HISTÓRICO
async function loadHistory() {
  try {
    const response = await fetch("/history");
    if (!response.ok) {
      throw new Error("Não foi possível carregar o histórico.");
    }
    const historyData = await response.json();
    displayHistory(historyData);
  } catch (error) {
    console.error("Erro ao carregar histórico:", error);
  }
}

function displayHistory(history) {
  const historyList = document.getElementById("history-list");
  if (history.length === 0) {
    historyList.innerHTML = "<p>Nenhuma análise foi feita ainda.</p>";
    return;
  }

  historyList.innerHTML = history
    .map(
      (item) => `
        <div class="history-item">
            <div class="history-header">
                <div class="history-header-left">
                    <span class="history-category category-${item.classification.toLowerCase()}">${
        item.classification
      }</span>
                    <span class="history-date">${new Date(
                      item.created_at
                    ).toLocaleString("pt-BR")}</span>
                </div>
                <div class="history-header-right">
                    <svg class="expand-arrow" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
            </div>
            <div class="history-content-wrapper">
                <p class="history-content">
                    <strong>E-mail Analisado:</strong><br>
                    ${item.email_content.replace(/\n/g, "<br>")}
                </p>
                <p class="history-content" style="margin-top: 1rem;">
                    <strong>Resposta Sugerida:</strong><br>
                    ${item.suggested_response.replace(/\n/g, "<br>")}
                </p>
            </div>
        </div>
    `
    )
    .join("");
}
