class FetchaJS {

    // Loadind UI
    static LOADING_START = 1;
    static LOADING_STOP = 0;
    // MODE 
    static MODE_LOCAL = "local";
    static MODE_SERVER = "server";
    //Pagination position
    static POSITION_TOP_LEFT = "top-left";
    static POSITION_TOP_CENTER = "top-center";
    static POSITION_TOP_RIGHT = "top-right";
    static POSITION_BOTTOM_LEFT = "bottom-left";
    static POSITION_BOTTOM_CENTER = "bottom-center";
    static POSITION_BOTTOM_RIGHT = "bottom-right";
    // Pagination Postion Array uses to check if user given position is correct
    static POSITION_ARRAY = ["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"];
    
    // Html loading
    #loadingUI = null;
    // user configuration
    #userConfig= null;
    // Where to put the view bind with data
    #container = null;
    // url to call in the server mode
    #saveUrl = null;
    // value get when divide total by limit
    #maxPagination = 0;
    // used to know if we should re-call api url to bind new view with data
    #pending_request = false;
    // key of the main json configuration who is also a json not a simple value
    #configTypeArray = ["pagination", "server", "language"];
    // Default JSON config with all option available
    #configJson = {
        // (siring) (local or server) 
        mode: FetchaJS.MODE_LOCAL,

        // (string) Html template who will be duplicated
        // It can be raw html Code ou absolute patch of the html file
        template: "",
        
        // (array of json) data to the put in the template
        data: "",

        // server configarution of how to fetch data from the server
        server : {
            url: "", // Api url
            method: "GET", // (string) : GET, POST, PACTH...
            headers: "", // (string) : Request header
            body: "", // (array, json) : // data to be put in the request body
            /** 
            * (function) closure :  closure to be called (if defined) when api come back from url
            * To get the total data length
            * Useful, when api data not contains a total key
            * 
            * ex: function(data) {
            *       return data.total
            *   };
            */
            total: null, // in server mode only
            /** 
            * (function) closure :  closure to be called (if defined) when api come back from url
            * To allow user to perform some action before we put json data in the view
            * 
            * ex: function(data) {
            *       // some code...
            *       return data
            *   };
            */
            then: null,
            // (function) closure :  closure to be called (if defined) when api come back from url and error came
            error: null
        },

        /**
        *   Pagination and infinite_scroll, can not work at the same time
        *   so if pagination is enable, the infinity_scroll will not work
        *   and vice versa
        */
        pagination: {
            enable: false, // (bool) : if pagination section will be visible or not
            current: 1, // (int) active page
            limit: 20, // (int) element to be displayed per page
            total: null, // (int) The total of element if limit and pagination not exist in local mode only
            buttonsCount: 5, // (int) Pagination total button to display whithout back and next page button include
            nextButton: true, // (bool) : if pagination next button will be visible or not
            prevButton: true, // (bool) : if pagination back button will be visible or not
            position: "bottom-right", // (string) : button position
            activeClass: "fetchajs--active", // class to be added at the current page button in the pagination section
            commonClass: 'fetchajs--pagination-button', // class to be added at the all button in the pagination section
            
            /**
            * (function) closure : Use when the fonctonnal mode is server
            * To allow user to perform some action (ex: change page index in the query of the api url)
            * when pagination button is clicked
            */
            server: null
        },
        
        // Word to be display in the element (button, input...)
        // Generate by the library
        language: {
            nextButton: "Suivant",
            prevButton: "Précédent"
        },

        // loading
        loading:  true
    };

    constructor(params) {
        if (typeof params !== 'object') {
            throw  'FetchJS: Contructor parameter must be json. Giver: '+typeof params;
        }
        this.#userConfig = this.#bindUserConfig(params);
    }

    render(containerId) {
        this.#container = document.getElementById(containerId);
        if (typeof this.#container === 'object' && this.#container != null ) {
            this.#container.style.transition = ".4s";
            this.#pending_request = this.#userConfig.mode == FetchaJS.MODE_SERVER;

            // Adding loading html UI
            this.#loadingUI = '<div id="fetchjs--loader"><div></div></div>';
            this.#container.innerHTML = this.#loadingUI;

            this.#process();   
        } else {
            throw ('FetchJS: Container not found');
        }
    };

    #process() {

        // Template can be directilly the html content or a html fill
        // if he is html file, we need to get his content before continue
        if (this.setTemplate(this.#userConfig.template)) {

            // Loading ui
            this.#loading(FetchaJS.LOADING_START);

            // If mode server 
            if (this.#userConfig.mode == FetchaJS.MODE_SERVER && this.#pending_request ) {
                this.#apiFetchData(this.#userConfig.server);
                this.#pending_request = false;
                return;
            }

            // Stop loading ui
            this.#loading(FetchaJS.LOADING_STOP);

            // append element
            this.#processFetch(this.#container, this.#userConfig.data, this.#userConfig.template, this.#userConfig.pagination.limit);

            // generatte pagination
            if (this.#userConfig.pagination.enable) {
                this.#processPagination(this.#userConfig.pagination);
            }

        } else {
            // Stop loading ui
            this.#loading(FetchaJS.LOADING_STOP);
        }

       
    }

    setCurrentpage(page) {
        // if mode local
        // here we just need to shift to the right offset
        this.#userConfig.pagination.current = page;
        
        if ( this.#userConfig.mode == FetchaJS.MODE_SERVER) {
            this.#pending_request = true;
            // we save url one time for prevent after append page query
            // to get multiple same page query in the url (ex: ?page=x?page=y)
            // Because, user server pagination function by default, append page query in the url
            if (this.#saveUrl == null) {
                this.#saveUrl = this.#userConfig.server.url;
            }
            // We check if custom server pagination function is set by the user and execute it
            // Otherwise, we just append page string query in the precedent url
            if ( typeof this.#userConfig.pagination.server === 'function' ) {
                let serverPaginationFunction = this.#userConfig.pagination.server;
                this.#userConfig.server.url = serverPaginationFunction(this.#saveUrl, page, this.#userConfig.pagination.limit);
            } else {
                this.#userConfig.server.url = this.#saveUrl+"?page="+page;
            }
        }
        
        this.#process();
    }

    getCurrentpage() {
        let currentPage = this.#userConfig.pagination.current;
        return currentPage < 1 ? 1 : currentPage;
    }

    setTemplate(template) {
        if (template.match(/(\w*)\.html$/)) {
            this.#readFileContentandProcess(template);
            return false;
        }
        
        if (this.#userConfig.template != template ) {
            this.#userConfig.template = template;
        }
        return true;
    }

    getTotal() {
        return this.#userConfig.pagination.total;
    }

    #proportiesFix(json, propertie, defaultValue) {
        let corectValue = defaultValue;
        if ( typeof json[propertie] !== "undefined" && json[propertie] != null ) {
            corectValue = json[propertie];
        }
        return corectValue;
    };

    #clean(obj) {
        for (var propName in obj) {
            if (obj[propName] === null || obj[propName] === undefined || obj[propName] == '' ) {
                delete obj[propName];
            }
        }
        return obj
    }

    #readFileContentandProcess(file) {
        fetch(file)
        .then(response => response.text())
        .then(data => {
            this.#userConfig.template = data;
            this.#process();
        });
    }

    #loading(statut = FetchaJS.LOADING_START) {
        // if loading enable
        if (this.#userConfig.loading) {
            
            if (statut == FetchaJS.LOADING_START) {
                this.#container.style.opacity = .4;
                document.querySelector("#fetchjs--loader").style.opacity = 1;
            } 
            
            else if (statut == FetchaJS.LOADING_STOP) {
                this.#container.style.opacity = 1;
                document.querySelector("#fetchjs--loader").style.opacity = 0;
            }
        }
    }

    #apiFetchData(serverConfig) {

        let context = this;
        let fetchConfig = {method: serverConfig.method}

        // Prepare form body
        // Check body
        let bodyContent = new FormData();
        if (serverConfig.body !== "undefined" && typeof serverConfig.body === "array") {
            (serverConfig.body).forEach(body => {
                bodyContent.append(body[0], body[1]);
            });
            fetchConfig["body"] = bodyContent;
        }
        
        // Check header
        if (typeof serverConfig.headers !== "undefined" ) {
            fetchConfig["headers"] = serverConfig.headers;
        }

        // Remove empty value from fetchConfig;
        fetchConfig = this.#clean(fetchConfig);

        // Call Url
        fetch(serverConfig.url, {
           fetchConfig
        })
        .then((resp) => {
            try {
                return resp.json();
            } catch(error) {
                context.#apiHandleError(serverConfig, error)
            }
        })
        .then(function(json) {
            context.#apiBindConfig(serverConfig, json);
        })
        .catch(function(error) {
            context.#apiHandleError(serverConfig, error)
        });
           
    }

    #apiHandleError(serverConfig, error) {
        if ( serverConfig.error !== "undefined" && typeof serverConfig.error === "function" ) {
            let handleFunction = serverConfig.error;
            handleFunction(error);
        } else {
            console.log(error);
        }
    }

    #apiBindConfig(serverConfig, api_json) {
        /**
         * Setting:
         * - total taking into account the clousure function
         * - data taking into account the clousure function
         */ 
        let serverTotalFunction = serverConfig.total; 

        if (typeof serverTotalFunction == 'function') {
            this.#userConfig.pagination.total =  serverTotalFunction(api_json);
        } else {
            throw 'FetchJS: server.total must be a function!';   
        }

        // dating data
        let serverDataFunction = serverConfig.then;
        if (typeof serverDataFunction == 'function') {
            this.#userConfig.data = serverDataFunction(api_json);
        } else {
            throw 'FetchJS: server.data must be a function!';   
        }

        this.#process();
    }

    #bindUserConfig(userConfig) {
        let context = this;
        let finalJson = this.#configJson;

        Object.keys(userConfig).forEach(function(key) {
            if ( finalJson.hasOwnProperty(key)) {
                // Ici on vérifié si la configuration est un object 
                // afin d'éviter d'écraser la config par défault
                // On n'affecte que les propriétés redéfini par l'utilisateur
                // sans touché aux autres propriétés.
                if ( context.#configTypeArray.includes(key) ) {
                    Object.keys(userConfig[key]).forEach(function(subKey) {
                        finalJson[key][subKey] = userConfig[key][subKey]; 
                    })
                } else {
                    finalJson[key] = userConfig[key];
                }
            }
        });

        return finalJson;
    }

    #bindDataToView(datas, view, limit) {
        let context = this;
        let count = 1;
        let formatView = null;
        let views = [];
        let offset = 0;

        // pagination offet
        // in the server mode, we dont need to offet the get data table
        // it is allready made on the server
        // But on locak mode, we need to shiht it to te right index
        // Because on local, get data is the total data possible
        if (this.#userConfig.mode == FetchaJS.MODE_LOCAL) {
             offset = (this.getCurrentpage() - 1) * limit;
        }

        for (let i = offset; i < datas.length; i++) {
            let data = datas[i];
            if ( typeof limit  === "undefined" 
            || (typeof limit  !== "undefined" &&  count <= parseInt(limit)) 
            ) {
                formatView = view;
                Object.keys(data).forEach(key => {
                    if ( formatView.includes("{"+key+"}") ) {
                        formatView = formatView.replace("{"+key+"}", data[key]);
                    }
                })
                views.push(formatView);
            
                count++;
            }
        }

        return views;
    }

    #bindDataPaginationButton(config) {
        /* current: 1, // (int) page actuel
        limit: 10, // (int) Nombre d'élément par page
        total: 100, // (int) Nombre d'élément au total
        buttonsCount: 5, // (int) Nombre total de bouton a affiché au niveau de la section pagination
        server: null */

        let paginationArray = [];
        let btnCount = config.buttonsCount;
        let btnPossibilite = [];
        let treeDot = false;

        // Nombre total de page possible en fonction du total et de la limite
        // On utilise la fonction ceil pour arrondir le resultat
        let possibleBtnCount = Math.ceil(this.getTotal() / config.limit);
        this.#maxPagination = possibleBtnCount;
        for(let i = 1; i <= possibleBtnCount; i++) {
            btnPossibilite.push(i);
        }

        // Minimum 1 bouton a fficher
        btnCount = btnCount < 1 ? 1 : btnCount; 

        // Ici on soustrait du milieu du tableau certains pages
        // Pour ensuite les remplacé par 3 points de suspension
        // afin de ne pas dépasser la limit du bouton a afficher
        if (possibleBtnCount > btnCount) {
            treeDot = true;
            for(let k = btnCount - 1; k < possibleBtnCount; k++) {
                let indexToRemove = parseInt(Math.floor(btnPossibilite.length /2));
                btnPossibilite.splice(indexToRemove, 1)
            }
        }

        // Récupération du bouton de la pagination
        paginationArray = btnPossibilite;

        // Adding previous a the button array start  
        if (config.prevButton) {
            paginationArray.unshift(this.#userConfig.language.prevButton)
        }

        // Adding next a the button array end  
        if (config.nextButton) {
            paginationArray.push(this.#userConfig.language.nextButton)
        }

        // Adding three in the middel of the button array if need
        if (treeDot) {
            let middleIndex = parseInt(Math.floor(paginationArray.length /2));
            paginationArray.splice(middleIndex, 0, "...");
        }

        return paginationArray;

    }

    #processFetch(container, data, template, limit) {
        container.innerHTML = (this.#bindDataToView(data,template, limit)).join("") + this.#loadingUI;
    }

    #processPagination(config) {
        let paginationButtonArray = this.#bindDataPaginationButton(config);
        let paginationButtons = [];

        // Check active class, commom class, current page;
        config.activeClass =  this.#proportiesFix(config, "activeClass", "fetchajs--active"); 
        config.commonClass =  this.#proportiesFix(config, "commonClass", "fetchajs--pagination-button"); 
        config.current =  this.#proportiesFix(config, "current", 1); 

        // Convert arrayButon ttext to html button
        // and put it in a array
        for(let i = 0; i < paginationButtonArray.length; i++) {

            let buttonText = paginationButtonArray[i];
            let activeClass = buttonText == config.current ? config.activeClass : '';
            let btnPageRef = buttonText;
            
            // Previous button should ref to the current page minus 1
            // And allways shuold be at least équal to 1; 
            if (config.prevButton && i == 0) {
                btnPageRef = config.current - 1 < 1 ? 1 :  config.current - 1;
            }
            // Nextt button should ref to the current page plus 1
            // And allways shuold be at most équal to max pagination possible; 
            if (config.nextButton && i == paginationButtonArray.length - 1) {
                let nextpage = parseInt(config.current) + 1; 
                btnPageRef = nextpage > this.#maxPagination ? this.#maxPagination : nextpage;
            }

            paginationButtons.push(
                `<button data-fetchajs-page="${btnPageRef}" type="button"  class="${config.commonClass+" "+activeClass}">
                    ${buttonText}
                </button>`);
        }

        // check postion
        config.position = (FetchaJS.POSITION_ARRAY).includes(config.position) ?  config.position : this.#proportiesFix(config, "position", FetchaJS.POSITION_BOTTOM_RIGHT); 
        let positionX = (config.position).replace(/\b(?:top-|bottom-)\b/gi, ''); 
        
        // html button array to string;
        let htmlPaginationButtons = `<div style="text-align: ${positionX}" class="fetchajs--pagination-block">${paginationButtons.join("")}</div>`;
        
        // adding button to view
        this.#container.innerHTML = (config.position).includes("top") ? htmlPaginationButtons + this.#container.innerHTML : this.#container.innerHTML + htmlPaginationButtons;
        
        // register on click event on pagination button
        this.#onclickBtnPagination();
    }

    #onclickBtnPagination() {
       let paginationButtons = document.querySelectorAll(".fetchajs--pagination-block button");
       paginationButtons.forEach(button => {
        button.addEventListener("click", () => {
            // Escape unlogic pagination
            // ex: when he click on the button page reference to current page
            // ex: current page is 1 and he click previous again;
            //ex:  current page is max and he click next again;
            if (this.#userConfig.pagination.current != button.dataset.fetchajsPage ) {
                this.setCurrentpage(button.dataset.fetchajsPage);
            }
        });
       });
    }
}