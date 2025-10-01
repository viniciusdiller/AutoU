import csv
from io import StringIO
from flask import Response

def export_history_to_csv(data):
    
    if not data:
        header = ['ID', 'Data/Hora', 'Classificação', 'Pontuação de Confiança', 'Conteúdo do E-mail', 'Resposta Sugerida']
        output = StringIO()
        writer = csv.writer(output, delimiter=';')
        writer.writerow(header)
        csv_string = output.getvalue()

        # Adiciona o BOM (\ufeff) para forçar o Excel a usar UTF-8
        return Response(
            '\ufeff' + csv_string,
            mimetype="text/csv",
            headers={
                "Content-disposition": "attachment; filename=historico_emails.csv"
            }
        )

    # Mapeamento de cabeçalhos de campo
    header_mapping = {
        'id': 'ID',
        'created_at': 'Data/Hora',
        'classification': 'Classificação',
        'confidence_score': 'Pontuação de Confiança',
        'email_content': 'Conteúdo do E-mail',
        'suggested_response': 'Resposta Sugerida'
    }
    
    fieldnames = list(header_mapping.keys())
    output = StringIO()

    writer = csv.DictWriter(output, fieldnames=fieldnames, delimiter=';', extrasaction='ignore', quoting=csv.QUOTE_MINIMAL)

    writer.writerow(header_mapping)
    
    processed_data = []
    for row in data:
        new_row = row.copy()
        # Remove quebras de linha ('\n' e '\r') dos campos de texto longo para evitar quebrar a linha do CSV
        if new_row.get('email_content'):
            new_row['email_content'] = new_row['email_content'].replace('\n', ' ').replace('\r', ' ')
        
        if new_row.get('suggested_response'):
            new_row['suggested_response'] = new_row['suggested_response'].replace('\n', ' ').replace('\r', ' ')
            
        processed_data.append(new_row)
        
    writer.writerows(processed_data)
    
    csv_string = output.getvalue()
    # Adiciona o BOM (\ufeff) no início da string
    response_content = '\ufeff' + csv_string
    
    return Response(
        response_content,
        mimetype="text/csv",
        headers={
            "Content-disposition": "attachment; filename=historico_analises.csv"
        }
    )