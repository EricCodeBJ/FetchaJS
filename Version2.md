-
-
-
-

# Fonctionnalité a intégré

# Events (loading, loaded, click_element, click_pagination, )

# infinite_scroll: {

before: () => {},
loading: () => {},
after: () => {}
},

# placeholder: {

enabled: true,
layout: "",
limit: 6,
},

// Si c'est activé, la pagination ne fonctionne plus
infinite_scroll: {
enabled: false, // (bool) : si le défilement automatique est activé ou non
custom: "", // (string) Code html de la vue de chargement
},
