import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timedelta
import requests
import json

# Configuración de estilo para las gráficas
sns.set_style("whitegrid")
plt.rcParams['figure.figsize'] = (12, 6)
plt.rcParams['font.size'] = 10

# URL de la API
API_URL = "http://localhost:8000"

def obtener_datos_api():
    """Obtiene los datos de citas desde la API"""
    try:
        response = requests.get(f"{API_URL}/citas")
        if response.status_code == 200:
            data = response.json()
            return data['citas']
        else:
            print("Error al obtener datos de la API")
            return []
    except Exception as e:
        print(f"Error de conexión: {e}")
        return []

def crear_dataframe(citas):
    """Convierte los datos de citas en un DataFrame de Pandas"""
    if not citas:
        print("No hay datos para analizar")
        return None
    
    df = pd.DataFrame(citas)
    
    # Convertir fecha a datetime
    df['fecha'] = pd.to_datetime(df['fecha'])
    
    # Extraer información adicional
    df['dia_semana'] = df['fecha'].dt.day_name()
    df['mes'] = df['fecha'].dt.month_name()
    df['semana'] = df['fecha'].dt.isocalendar().week
    
    return df

def analisis_general(df):
    """Realiza un análisis general de las citas"""
    print("="*60)
    print("ANÁLISIS GENERAL DEL SISTEMA DE CITAS MÉDICAS")
    print("="*60)
    
    print(f"\n📊 Total de citas agendadas: {len(df)}")
    print(f"📅 Rango de fechas: {df['fecha'].min().date()} - {df['fecha'].max().date()}")
    
    print("\n🏥 Distribución por Centro de Salud:")
    print(df['centro_salud'].value_counts())
    
    print("\n🩺 Distribución por Especialidad:")
    print(df['especialidad'].value_counts())
    
    print("\n📍 Distribución por Estado:")
    print(df['estado'].value_counts())
    
    print("\n📆 Citas por Día de la Semana:")
    print(df['dia_semana'].value_counts())
    
    return df

def visualizaciones(df):
    """Genera visualizaciones de los datos"""
    
    # Crear figura con múltiples subplots
    fig = plt.figure(figsize=(16, 12))
    
    # 1. Gráfico de barras: Citas por especialidad
    plt.subplot(2, 3, 1)
    especialidades = df['especialidad'].value_counts()
    especialidades.plot(kind='bar', color='skyblue', edgecolor='black')
    plt.title('Citas por Especialidad', fontsize=14, fontweight='bold')
    plt.xlabel('Especialidad')
    plt.ylabel('Número de Citas')
    plt.xticks(rotation=45, ha='right')
    
    # 2. Gráfico circular: Distribución por centro de salud
    plt.subplot(2, 3, 2)
    centros = df['centro_salud'].value_counts()
    plt.pie(centros, labels=centros.index, autopct='%1.1f%%', startangle=90)
    plt.title('Distribución por Centro de Salud', fontsize=14, fontweight='bold')
    
    # 3. Gráfico de barras: Estado de las citas
    plt.subplot(2, 3, 3)
    estados = df['estado'].value_counts()
    colores = ['#28a745', '#ffc107', '#dc3545']
    estados.plot(kind='bar', color=colores[:len(estados)], edgecolor='black')
    plt.title('Estado de las Citas', fontsize=14, fontweight='bold')
    plt.xlabel('Estado')
    plt.ylabel('Cantidad')
    plt.xticks(rotation=0)
    
    # 4. Gráfico de línea: Tendencia temporal
    plt.subplot(2, 3, 4)
    citas_por_fecha = df.groupby('fecha').size()
    plt.plot(citas_por_fecha.index, citas_por_fecha.values, marker='o', linewidth=2, color='purple')
    plt.title('Tendencia de Citas en el Tiempo', fontsize=14, fontweight='bold')
    plt.xlabel('Fecha')
    plt.ylabel('Número de Citas')
    plt.xticks(rotation=45)
    plt.grid(True, alpha=0.3)
    
    # 5. Gráfico de barras: Citas por día de la semana
    plt.subplot(2, 3, 5)
    dias_orden = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    dias_esp = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    dias_count = df['dia_semana'].value_counts().reindex(dias_orden, fill_value=0)
    plt.bar(dias_esp, dias_count.values, color='coral', edgecolor='black')
    plt.title('Citas por Día de la Semana', fontsize=14, fontweight='bold')
    plt.xlabel('Día')
    plt.ylabel('Número de Citas')
    plt.xticks(rotation=45, ha='right')
    
    # 6. Heatmap: Especialidades por Centro
    plt.subplot(2, 3, 6)
    heatmap_data = pd.crosstab(df['especialidad'], df['centro_salud'])
    sns.heatmap(heatmap_data, annot=True, fmt='d', cmap='YlOrRd', cbar_kws={'label': 'Cantidad'})
    plt.title('Especialidades por Centro de Salud', fontsize=14, fontweight='bold')
    plt.xlabel('Centro de Salud')
    plt.ylabel('Especialidad')
    plt.xticks(rotation=45, ha='right')
    plt.yticks(rotation=0)
    
    plt.tight_layout()
    plt.savefig('analisis_citas_medicas.png', dpi=300, bbox_inches='tight')
    print("\n✅ Visualizaciones guardadas en 'analisis_citas_medicas.png'")
    plt.show()

def estadisticas_avanzadas(df):
    """Genera estadísticas avanzadas"""
    print("\n" + "="*60)
    print("ESTADÍSTICAS AVANZADAS")
    print("="*60)
    
    # Centro más solicitado
    centro_top = df['centro_salud'].mode()[0]
    print(f"\n🏆 Centro más solicitado: {centro_top}")
    
    # Especialidad más solicitada
    especialidad_top = df['especialidad'].mode()[0]
    print(f"🏆 Especialidad más solicitada: {especialidad_top}")
    
    # Día con más citas
    dia_top = df['dia_semana'].mode()[0]
    print(f"🏆 Día con más citas: {dia_top}")
    
    # Promedio de citas por día
    promedio_citas = len(df) / df['fecha'].nunique()
    print(f"\n📊 Promedio de citas por día: {promedio_citas:.2f}")
    
    # Matriz de correlación entre especialidades y centros
    print("\n📈 Top 5 Combinaciones (Especialidad + Centro):")
    combinaciones = df.groupby(['especialidad', 'centro_salud']).size().sort_values(ascending=False).head(5)
    for (esp, centro), count in combinaciones.items():
        print(f"   • {esp} en {centro}: {count} citas")

def generar_reporte_completo():
    """Función principal que ejecuta todo el análisis"""
    print("Conectando con la API...")
    citas = obtener_datos_api()
    
    if not citas:
        print("⚠️ No hay datos para analizar. Asegúrate de que:")
        print("   1. El servidor FastAPI esté corriendo (python main.py)")
        print("   2. Existan citas agendadas en el sistema")
        return
    
    print(f"✅ Se obtuvieron {len(citas)} citas\n")
    
    # Crear DataFrame
    df = crear_dataframe(citas)
    
    if df is None:
        return
    
    # Realizar análisis
    analisis_general(df)
    estadisticas_avanzadas(df)
    
    # Generar visualizaciones
    print("\n🎨 Generando visualizaciones...")
    visualizaciones(df)
    
    # Exportar datos a CSV
    df.to_csv('citas_exportadas.csv', index=False)
    print("\n✅ Datos exportados a 'citas_exportadas.csv'")
    
    print("\n" + "="*60)
    print("ANÁLISIS COMPLETADO")
    print("="*60)

if __name__ == "__main__":
    generar_reporte_completo()