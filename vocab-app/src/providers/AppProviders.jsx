import React from 'react';
import { NavigationContext } from '../contexts/NavigationContext';
import { SettingsContext } from '../contexts/SettingsContext';
import { PreferencesContext } from '../contexts/PreferencesContext';
import { LibraryContext } from '../contexts/LibraryContext';
import { SearchContext } from '../contexts/SearchContext';
import { ReviewContext } from '../contexts/ReviewContext';

const AppProviders = ({ app, children }) => {
    return (
        <NavigationContext.Provider value={app.navigation}>
            <SettingsContext.Provider value={app.settings}>
                <PreferencesContext.Provider value={app.preferences}>
                    <LibraryContext.Provider value={app.library}>
                        <SearchContext.Provider value={app.search}>
                            <ReviewContext.Provider value={app.review}>
                                {children}
                            </ReviewContext.Provider>
                        </SearchContext.Provider>
                    </LibraryContext.Provider>
                </PreferencesContext.Provider>
            </SettingsContext.Provider>
        </NavigationContext.Provider>
    );
};

export default AppProviders;
