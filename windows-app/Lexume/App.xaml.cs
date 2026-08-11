using System.Windows;

namespace Lexume
{
    /// <summary>
    /// Application entry point - the WPF/.NET Framework analog of
    /// `LexumeApp.swift`'s `@main` struct and `LexumeApplication.kt`'s
    /// `Application` subclass. Empty for now (M1); app-wide singletons
    /// (data layer, secure key store, network clients) get wired in here
    /// as later milestones add them, matching the "single object graph,
    /// no DI framework" approach both other platforms use.
    /// </summary>
    public partial class App : Application
    {
    }
}
