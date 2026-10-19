#!/bin/zsh
cd "${0:A:h}"
if [[ ! -d node_modules ]]; then
  echo "Installation des dépendances SETFLOW…"
  npm install || exit 1
fi
echo "SETFLOW : ouvrez http://127.0.0.1:3002 dans votre navigateur."
echo "Pour arrêter : Ctrl+C."
npm run dev
