#!/bin/bash
# ─── Generar Keystore para TurnosApp ───
# Ejecutar: bash scripts/generate-keystore.sh
# Requisito: Java JDK 17+ instalado (keytool)

KEYSTORE_FILE="turnos-keystore.jks"
KEYSTORE_PASSWORD=""
KEY_ALIAS="turnosapp"
KEY_PASSWORD=""
VALIDITY=36500  # 100 años

echo "======================================"
echo "  🔐 Generar Keystore - TurnosApp"
echo "======================================"
echo ""

# Verificar que keytool existe
if ! command -v keytool &> /dev/null; then
    echo "❌ ERROR: keytool no encontrado. Instala Java JDK 17+"
    exit 1
fi

# Solicitar contraseñas
read -s -p "🔑 Contraseña del keystore: " KEYSTORE_PASSWORD
echo ""
read -s -p "🔑 Confirmar contraseña: " KEYSTORE_PASSWORD2
echo ""
if [ "$KEYSTORE_PASSWORD" != "$KEYSTORE_PASSWORD2" ]; then
    echo "❌ Las contraseñas no coinciden"
    exit 1
fi

read -s -p "🔑 Contraseña de la key: " KEY_PASSWORD
echo ""
read -s -p "🔑 Confirmar contraseña de la key: " KEY_PASSWORD2
echo ""
if [ "$KEY_PASSWORD" != "$KEY_PASSWORD2" ]; then
    echo "❌ Las contraseñas no coinciden"
    exit 1
fi

# Datos del propietario
echo ""
echo "📝 Datos del propietario (dejar vacío = omitir):"
read -p "   Nombre y Apellido: " NAME
read -p "   Unidad Organizacional: " OU
read -p "   Organización: " ORG
read -p "   Ciudad: " CITY
read -p "   Provincia: " STATE
read -p "   País (CL): " COUNTRY
COUNTRY=${COUNTRY:-CL}

DN="CN=${NAME:-TurnosApp}, OU=${OU:-Development}, O=${ORG:-Personal}, L=${CITY:-Santiago}, ST=${STATE:-RM}, C=${COUNTRY}"

echo ""
echo "⚙️  Generando keystore..."
keytool -genkey -v \
    -keystore "$KEYSTORE_FILE" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity $VALIDITY \
    -storepass "$KEYSTORE_PASSWORD" \
    -keypass "$KEY_PASSWORD" \
    -dname "$DN"

echo ""
echo "======================================"
echo "  ✅ Keystore generado: $KEYSTORE_FILE"
echo "======================================"
echo ""
echo "📌 GUARDA ESTOS DATOS EN UN LUGAR SEGURO:"
echo "   Alias:        $KEY_ALIAS"
echo "   Keystore:     $KEYSTORE_FILE"
echo "   Password:     (la que ingresaste)"
echo "   Key Password: (la que ingresaste)"
echo ""
echo "🚀 Para subir a GitHub Secrets:"
echo "   1. Codificar en base64:"
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    echo "      certutil -encode $KEYSTORE_FILE keystore_base64.txt && type keystore_base64.txt"
else
    echo "      base64 -i $KEYSTORE_FILE | pbcopy  # macOS"
    echo "      # o"
    echo "      base64 -w0 $KEYSTORE_FILE > keystore_base64.txt && cat keystore_base64.txt"
fi
echo ""
echo "   2. Crear Secrets en GitHub:"
echo "      - ANDROID_KEYSTORE_BASE64 = contenido de keystore_base64.txt"
echo "      - KEYSTORE_PASSWORD     = (la que ingresaste)"
echo "      - KEY_ALIAS             = $KEY_ALIAS"
echo "      - KEY_PASSWORD          = (la que ingresaste)"
echo ""
echo "⚠️  NUNCA subas el archivo .jks al repositorio"
